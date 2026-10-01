const { generateOTP } = require('../../backend/utils/generateOTP');

describe('OTP generation', () => {
  it('generates a numeric OTP of the expected length', () => {
    const otp = generateOTP(6);
    expect(otp).toMatch(/^\d{6}$/);
  });
});
