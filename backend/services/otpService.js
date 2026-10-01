const nodemailer = require('nodemailer');
const { generateOTP } = require('../utils/generateOTP');

const sendOTP = async (email, otpCode) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.OTP_EMAIL,
      pass: process.env.OTP_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.OTP_EMAIL,
    to: email,
    subject: 'Voting OTP Verification',
    text: `Your OTP is: ${otpCode}`,
  });
};

const createOTPForVoter = async (voter) => {
  const otpCode = generateOTP(6);
  voter.otpCode = otpCode;
  voter.otpVerified = false;
  await voter.save();

  await sendOTP(voter.email, otpCode);
  return otpCode;
};

module.exports = { sendOTP, createOTPForVoter };
