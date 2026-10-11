'use strict';

const { hashValue } = require('../crypto/sha256');

/**
 * Generates a SHA-256 vote receipt hash matching Member 7's verification formula.
 * Formula: SHA-256(encryptedVote + ":" + iv + ":" + candidateId)
 *
 * @param {string} encryptedVote - Hex AES-GCM ciphertext
 * @param {string} iv            - Hex IV (24 characters / 12 bytes)
 * @param {string} candidateId   - Identifier of the selected candidate
 * @returns {string} 64-character SHA-256 hex digest
 */
const generateReceipt = (encryptedVote, iv, candidateId) => {
  return hashValue(`${encryptedVote}:${iv}:${candidateId}`);
};

module.exports = { generateReceipt };
