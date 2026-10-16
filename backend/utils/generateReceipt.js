'use strict';

const { hashValue } = require('../crypto/sha256');

/**
 * Generates a SHA-256 vote receipt hash matching Member 7's verification formula.
 * Formula: SHA-256(encryptedVote + ":" + iv + ":" + authTag)
 *
 * @param {string} encryptedVote - Hex AES-GCM ciphertext
 * @param {string} iv            - Hex IV (24 characters / 12 bytes)
 * @param {string} authTag       - Hex AES-GCM authentication tag (32 characters / 16 bytes)
 * @returns {string} 64-character SHA-256 hex digest
 */
const generateReceipt = (encryptedVote, iv, authTag) => {
  return hashValue(`${encryptedVote}:${iv}:${authTag}`);
};

module.exports = { generateReceipt };
