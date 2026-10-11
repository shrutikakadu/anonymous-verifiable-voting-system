const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { generateOTP } = require('../utils/generateOTP');

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const sendOTP = async (email, otpCode, purpose) => {
  if (!process.env.OTP_EMAIL || !process.env.OTP_EMAIL_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OTP email delivery is not configured');
    }
    console.log(`[DEV MODE] ${purpose} OTP for ${email}: ${otpCode}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.OTP_EMAIL, pass: process.env.OTP_EMAIL_PASSWORD },
  });

  await transporter.sendMail({
    from: process.env.OTP_EMAIL,
    to: email,
    subject: purpose === 'registration' ? 'Verify your voter registration' : 'Your voter login code',
    text: `Your ${purpose} verification code is ${otpCode}. It expires in 5 minutes. Do not share this code.`,
  });
};

const createOTPForVoter = async (voter, purpose) => {
  if (!['registration', 'login'].includes(purpose)) {
    throw new Error('Invalid OTP purpose');
  }
  if (voter.otpLastSentAt && voter.otpLastPurpose === purpose
      && Date.now() - new Date(voter.otpLastSentAt).getTime() < OTP_COOLDOWN_MS) {
    const error = new Error('Please wait 60 seconds before requesting another OTP');
    error.status = 429;
    throw error;
  }

  const code = generateOTP(6);
  voter.otpHash = await bcrypt.hash(code, 10);
  voter.otpPurpose = purpose;
  voter.otpExpiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
  voter.otpLastSentAt = new Date();
  voter.otpLastPurpose = purpose;
  voter.otpAttempts = 0;
  if (purpose === 'login') voter.otpVerified = false;
  await voter.save();
  await sendOTP(voter.email, code, purpose);
};

module.exports = { sendOTP, createOTPForVoter, OTP_MAX_ATTEMPTS, OTP_COOLDOWN_MS };
