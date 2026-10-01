const Voter = require('../models/Voter');

const getVoterProfile = async (req, res, next) => {
  try {
    const voter = await Voter.findById(req.user.sub).select('-passwordHash -otpCode');
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    return res.json({ voter });
  } catch (error) {
    next(error);
  }
};

module.exports = { getVoterProfile };
