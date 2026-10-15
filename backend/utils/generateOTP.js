const crypto = require('crypto');

// Cryptographically secure OTPs (unlike Math.random()).
const generateOTP = (length = 6) => {
  if (!Number.isInteger(length) || length < 4 || length > 10) {
    throw new Error('OTP length must be between 4 and 10 digits');
  }
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
};

module.exports = { generateOTP };
