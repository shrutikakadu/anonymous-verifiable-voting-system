const mongoose = require('mongoose');

const votingTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  usedAt: { type: Date, default: null },
});

module.exports = mongoose.model('VotingToken', votingTokenSchema);
