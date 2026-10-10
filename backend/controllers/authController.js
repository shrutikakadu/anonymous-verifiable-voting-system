const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const { jwtSecret } = require('../config/keys');
const { isValidEmail, isStrongPassword, isValidVoterId } = require('../utils/validation');
const { createOTPForVoter } = require('../services/otpService');

const register = async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const voterId = typeof req.body.voterId === 'string' ? req.body.voterId.trim().toUpperCase() : '';
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
    const voter = await Voter.create({
      name,
      voterId,
      email,
      passwordHash,
    });

    let otpDeliveryWarning;
    try {
      await createOTPForVoter(voter);
    } catch (error) {
      // The voter is already safely stored. Do not make the client retry registration
      // and hit a duplicate; explain that OTP delivery needs attention instead.
      console.error('Voter registered, but OTP delivery failed:', error.message);
      otpDeliveryWarning = ' Registration was saved, but the OTP email could not be sent.';
    }

    return res.status(201).json({
      message: `Registration successful.${otpDeliveryWarning || ' OTP sent to email.'}`,
      voter: {
        id: voter._id,
        name: voter.name,
        voterId: voter.voterId,
        email: voter.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A voter with this ID or email is already registered' });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const voterId = typeof req.body.voterId === 'string' ? req.body.voterId.trim().toUpperCase() : '';

    if (!voterId || !password) {
      return res.status(400).json({ message: 'Voter ID and password are required' });
    }

    const voter = await Voter.findOne({ voterId }).select('+passwordHash');
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    const validPassword = await bcrypt.compare(password, voter.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: voter._id, role: 'voter', voterId: voter.voterId }, jwtSecret, {
      expiresIn: '2h',
    });

    return res.json({
      message: 'Login successful. OTP verification required.',
      token,
      voter: { id: voter._id, voterId: voter.voterId, email: voter.email },
    });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { otpCode } = req.body;
    const voterId = typeof req.body.voterId === 'string' ? req.body.voterId.trim().toUpperCase() : '';

    if (!voterId || !otpCode) {
      return res.status(400).json({ message: 'Voter ID and OTP are required' });
    }

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    if (voter.otpCode !== String(otpCode)) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    voter.otpVerified = true;
    voter.otpCode = null;
    await voter.save();

    return res.json({
      message: 'OTP verified successfully',
      status: 'verified',
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  return res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, verifyOTP, logout };
