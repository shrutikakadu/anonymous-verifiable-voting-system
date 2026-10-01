const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  voterId: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  isEligible: { type: Boolean, default: true },
  hasVoted: { type: Boolean, default: false },
  otpCode: { type: String, default: null },
  otpVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Voter', voterSchema);
