const mongoose = require('mongoose');

/**
 * VotingToken Model
 * -----------------
 * Stores ONLY the SHA-256 hash of an issued RSA-signed voting token.
 * The raw token is NEVER stored — only a hash — so voter identity
 * cannot be linked back from this collection.
 *
 * Part 4 (Arya Akhade): Token Verification + Double Vote Prevention
 */
const votingTokenSchema = new mongoose.Schema({
  // SHA-256 hash of the raw random token (never store the raw token)
  tokenHash: { type: String, required: true, unique: true, index: true },

  // Whether this token has already been consumed by a vote cast
  used: { type: Boolean, default: false, index: true },

  // Timestamp when the token was created (issued)
  createdAt: { type: Date, default: Date.now },

  // Timestamp when the token was consumed — null until first use
  usedAt: { type: Date, default: null },

  // Optional: rejection reason logged for auditing/debugging
  // e.g. 'SIGNATURE_INVALID', 'NOT_FOUND', 'ALREADY_USED'
  rejectionReason: { type: String, default: null },
});

// Compound index: quickly find unused tokens
votingTokenSchema.index({ tokenHash: 1, used: 1 });

module.exports = mongoose.model('VotingToken', votingTokenSchema);
