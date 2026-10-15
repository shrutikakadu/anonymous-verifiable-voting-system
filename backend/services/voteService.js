'use strict';

const Vote = require('../models/Vote');
const { hashValue } = require('../crypto/sha256');
const { encryptAES } = require('../crypto/aes');

/**
 * Generates the SHA-256 vote receipt hash.
 * Formula: SHA-256(encryptedVote + ":" + iv + ":" + authTag)
 * Exactly matches Member 7's verification formula in verificationService.js.
 *
 * @param {string} encryptedVote - Hex AES-GCM ciphertext
 * @param {string} iv            - Hex IV (24 characters / 12 bytes)
 * @param {string} authTag       - Hex AES-GCM authentication tag (32 characters / 16 bytes)
 * @returns {string} 64-character SHA-256 hex digest
 */
const generateReceipt = (encryptedVote, iv, authTag) => {
  return hashValue(`${encryptedVote}:${iv}:${authTag}`);
};

/**
 * Encrypts vote payload using Member 5's AES-256-GCM implementation.
 * Validates secretKey is exactly 64 hexadecimal characters.
 *
 * @param {object|string} votePayload - The vote data to encrypt
 * @param {string} secretKey          - 64-character hex AES key
 * @returns {{ encryptedVote: string, iv: string, authTag: string, algorithm: string }}
 */
const encryptVotePayload = (votePayload, secretKey) => {
  if (!secretKey || typeof secretKey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    throw new Error('AES key must be exactly 64 hexadecimal characters.');
  }

  const payloadString = typeof votePayload === 'string' ? votePayload : JSON.stringify(votePayload);
  return encryptAES(payloadString, secretKey);
};

/**
 * Persists an encrypted vote record to MongoDB.
 *
 * @param {object} params
 * @param {string} params.encryptedVote
 * @param {string} params.iv
 * @param {string} params.authTag
 * @param {string} [params.receiptHash]
 * @returns {Promise<{ vote: object, receiptHash: string }>}
 */
const storeVote = async ({ encryptedVote, iv, authTag, receiptHash }) => {
  const finalReceiptHash = receiptHash || generateReceipt(encryptedVote, iv, authTag);

  const vote = await Vote.create({
    encryptedVote,
    iv,
    authTag,
    receiptHash: finalReceiptHash,
  });

  return { vote, receiptHash: finalReceiptHash };
};

module.exports = {
  generateReceipt,
  encryptVotePayload,
  storeVote,
};
