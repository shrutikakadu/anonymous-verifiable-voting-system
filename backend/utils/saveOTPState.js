// Mongoose includes document.$where in the atomic UPDATE filter. A stale OTP
// snapshot must never consume or overwrite a newer code or attempt count.
const saveOTPState = async (voter, expected) => {
  const previous = voter.$where;
  voter.$where = { ...previous, ...expected };
  try {
    await voter.save();
    return true;
  } catch (error) {
    if (error.name === 'DocumentNotFoundError') return false;
    throw error;
  } finally {
    voter.$where = previous;
  }
};

module.exports = { saveOTPState };
