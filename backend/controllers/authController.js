const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const RevokedToken = require('../models/RevokedToken');
const { jwtSecret } = require('../config/keys');
const { isValidEmail, isStrongPassword, isValidVoterId } = require('../utils/validation');
const { createOTPForVoter, OTP_MAX_ATTEMPTS } = require('../services/otpService');

const normalizeVoterId = (value) => typeof value === 'string' ? value.trim().toUpperCase() : '';
const genericLoginError = { message: 'Invalid voter ID or password' };

const register = async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const voterId = normalizeVoterId(req.body.voterId);
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!name || !voterId || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!isValidVoterId(voterId) || !isValidEmail(email) || !isStrongPassword(password)) {
      return res.status(400).json({ message: 'Invalid registration data' });
    }
    const existingVoter = await Voter.findOne({ $or: [{ voterId }, { email }] });
    if (existingVoter) {
      return res.status(409).json({ message: 'Duplicate voter registration' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const voter = await Voter.create({ name, voterId, email, passwordHash });

    // Saving a voter is not the same as verifying their email.
    let otpSent = false;
    try {
      await createOTPForVoter(voter, 'registration');
      otpSent = true;
    } catch (error) {
      console.error('Registration saved but OTP delivery failed:', error.message);
    }

    return res.status(201).json({
      message: otpSent
        ? 'Registration saved. Enter the OTP to verify your email.'
        : 'Registration saved, but OTP delivery failed. Contact support to request a new code.',
      otpSent,
      voter: { id: voter._id, name: voter.name, voterId: voter.voterId, email: voter.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A voter with this ID or email is already registered' });
    }
    next(error);
  }
};

// Recovery path when registration email failed: password required to prevent abuse.
const resendRegistrationOTP = async (req, res, next) => {
  try {
    const voterId = normalizeVoterId(req.body.voterId);
    const { password } = req.body;
    if (!voterId || !password) return res.status(400).json({ message: 'Voter ID and password are required' });
    const voter = await Voter.findOne({ voterId }).select('+passwordHash');
    if (!voter || !(await bcrypt.compare(password, voter.passwordHash))) {
      return res.status(401).json(genericLoginError);
    }
    if (voter.emailVerified) return res.status(409).json({ message: 'Registration email already verified' });
    try {
      await createOTPForVoter(voter, 'registration');
    } catch (error) {
      if (error.status === 429) return res.status(429).json({ message: error.message });
      console.error('Registration OTP resend failed:', error.message);
      return res.status(503).json({ message: 'Unable to deliver OTP. Try again later.' });
    }
    return res.json({ message: 'Registration OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const voterId = normalizeVoterId(req.body.voterId);
    const { password } = req.body;
    if (!voterId || !password) {
      return res.status(400).json({ message: 'Voter ID and password are required' });
    }

    const voter = await Voter.findOne({ voterId }).select('+passwordHash');
    if (!voter || !(await bcrypt.compare(password, voter.passwordHash))) {
      return res.status(401).json(genericLoginError);
    }
    if (!voter.emailVerified) {
      return res.status(403).json({ message: 'Please verify your registration email before logging in.' });
    }

    try {
      await createOTPForVoter(voter, 'login');
    } catch (error) {
      if (error.status === 429) return res.status(429).json({ message: error.message });
      console.error('Login OTP delivery failed:', error.message);
      return res.status(503).json({ message: 'Unable to deliver the login OTP. Try again later.' });
    }

    // No JWT is issued until the second factor has been verified.
    return res.json({
      message: 'Password verified. Login OTP sent.',
      voter: { id: voter._id, voterId: voter.voterId, email: voter.email },
    });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const voterId = normalizeVoterId(req.body.voterId);
    const { otpCode, purpose } = req.body;
    if (!voterId || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)
        || !['registration', 'login'].includes(purpose)) {
      return res.status(400).json({ message: 'Voter ID, six-digit OTP and purpose are required' });
    }

    const voter = await Voter.findOne({ voterId }).select('+otpHash');
    if (!voter || !voter.otpHash || voter.otpPurpose !== purpose || !voter.otpExpiresAt) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    if (voter.otpExpiresAt <= new Date() || voter.otpAttempts >= OTP_MAX_ATTEMPTS) {
      voter.otpHash = null;
      voter.otpPurpose = null;
      voter.otpExpiresAt = null;
      await voter.save();
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    const validOTP = await bcrypt.compare(otpCode, voter.otpHash);
    if (!validOTP) {
      voter.otpAttempts += 1;
      if (voter.otpAttempts >= OTP_MAX_ATTEMPTS) {
        voter.otpHash = null;
        voter.otpPurpose = null;
        voter.otpExpiresAt = null;
      }
      await voter.save();
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    // Consume OTP so it cannot be replayed in either flow.
    voter.otpHash = null;
    voter.otpPurpose = null;
    voter.otpExpiresAt = null;
    voter.otpAttempts = 0;

    if (purpose === 'registration') {
      voter.emailVerified = true;
      await voter.save();
      return res.json({ message: 'Email verified. You can now log in.', status: 'verified' });
    }

    if (!voter.emailVerified) {
      return res.status(403).json({ message: 'Registration verification required' });
    }
    voter.otpVerified = true; // Kept for the existing voting-token module.
    await voter.save();

    const token = jwt.sign(
      { sub: voter._id.toString(), role: 'voter', voterId: voter.voterId, otp: true },
      jwtSecret,
      { expiresIn: '2h' }
    );
    return res.json({ message: 'Login OTP verified', status: 'verified', token });
  } catch (error) {
    next(error);
  }
};

// Revoke the current bearer token until its normal expiry.
const logout = async (req, res, next) => {
  try {
    await RevokedToken.updateOne(
      { tokenHash: req.tokenHash },
      { $setOnInsert: { tokenHash: req.tokenHash, expiresAt: new Date(req.user.exp * 1000) } },
      { upsert: true }
    );
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, resendRegistrationOTP, login, verifyOTP, logout };
