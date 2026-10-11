const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  voterId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  isEligible: { type: Boolean, default: true },
  hasVoted: { type: Boolean, default: false },
  hasReceivedToken: { type: Boolean, default: false },

  // Registration verification is permanent; login verification is per sign-in.
  emailVerified: { type: Boolean, default: false },
  otpVerified: { type: Boolean, default: false }, // Used by the token-issuance module.
  otpHash: { type: String, default: null, select: false },
  otpPurpose: { type: String, enum: ['registration', 'login'], default: null },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },
  otpLastPurpose: { type: String, enum: ['registration', 'login'], default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Voter', voterSchema);
