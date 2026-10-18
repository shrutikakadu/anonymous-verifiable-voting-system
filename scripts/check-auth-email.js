// Run locally. Never prints credentials, OTP values or raw provider errors.
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const backendRequire = createRequire(require.resolve('../backend/package.json'));
const { getEmailConfig, sendOTP } = require('../backend/services/otpService');
const { generateOTP } = require('../backend/utils/generateOTP');
const { isValidEmail } = require('../backend/utils/validation');

const main = async (args = process.argv.slice(2)) => {
  const rootEnv = path.resolve(__dirname, '../.env');
  backendRequire('dotenv').config({ path: rootEnv });
  console.log(`ROOT_ENV: ${fs.existsSync(rootEnv)}`);
  console.log(`EMAIL_LOADED: ${Boolean(process.env.OTP_EMAIL?.trim())}`);
  console.log(`PASSWORD_LOADED: ${Boolean(process.env.OTP_EMAIL_PASSWORD?.trim())}`);
  console.log(`JWT_SECRET_CONFIGURED: ${Boolean(process.env.JWT_SECRET
    && !['development_secret', 'replace_with_secure_random_secret'].includes(process.env.JWT_SECRET))}`);
  try {
    getEmailConfig();
    if (args.length === 0 || (args.length === 1 && args[0] === '--check')) {
      console.log('Email configuration present. No SMTP connection or email delivery was tested.');
      return 0;
    }
    if (args.length !== 2 || args[0] !== '--send-to' || !isValidEmail(args[1])) {
      console.error('Usage: node scripts/check-auth-email.js [--check | --send-to recipient@example.com]');
      return 1;
    }
    await sendOTP(args[1], generateOTP(6), 'registration');
    console.log('SMTP accepted the test email. Check the recipient inbox/spam to confirm arrival. This code does not verify an account.');
    return 0;
  } catch (error) {
    const knownCodes = ['OTP_EMAIL_NOT_CONFIGURED', 'OTP_EMAIL_REJECTED', 'EAUTH',
      'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EENVELOPE', 'EDNS'];
    const code = knownCodes.includes(error.code) ? error.code : 'EMAIL_CHECK_FAILED';
    console.error(`Email check failed (${code}). Check the root .env and Gmail sender configuration. No secrets were printed.`);
    return 1;
  }
};

if (require.main === module) main().then((code) => { process.exitCode = code; });
module.exports = { main };
