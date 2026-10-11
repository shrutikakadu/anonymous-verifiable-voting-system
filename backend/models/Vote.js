const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  encryptedVote: { type: String, required: true },
  iv:            { type: String, required: true },
  authTag:       { type: String, required: true },
  receiptHash:   { type: String, required: true, unique: true },
  candidateId:   { type: String, required: true },
  timestamp:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vote', voteSchema);
