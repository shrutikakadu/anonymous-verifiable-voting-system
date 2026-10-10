const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  voterId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  isEligible: { type: Boolean, default: true },
  hasVoted: { type: Boolean, default: false },
  hasReceivedToken: { type: Boolean, default: false }, // Part 3: prevents duplicate token issuance
  otpCode: { type: String, default: null },
  otpVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Voter', voterSchema);
