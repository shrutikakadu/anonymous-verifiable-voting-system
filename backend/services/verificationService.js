/**
 * verificationService.js
 * -----------------------
 * Part 7 (Shrutika): Bulletin Board + Vote Verification
 *
 * This service handles all business and cryptographic verification logic for:
 *  1. Public bulletin board queries with total recorded votes
 *  2. Search and pagination over public vote receipts
 *  3. Receipt hash format validation (64-char hex SHA-256)
 *  4. Cryptographic integrity check against stored encrypted vote record
 *  5. Generating auditable verification status ("Vote included" vs "Not verified")
 *
 * CNS Concepts covered:
 *  - Integrity (SHA-256 cryptographic proof)
 *  - Transparency (Public ledger of anonymous receipts)
 *  - Public Verification (Individual verifiability: voters can verify inclusion)
 *  - Hash-based verification (Zero-knowledge proof of ballot presence)
 *  - Auditability (Independent tally and audit trail without identity exposure)
 */

'use strict';

const Vote = require('../models/Vote');
const { hashValue } = require('../crypto/sha256');

/**
 * Result status codes for receipt verification
 */
const VERIFICATION_CODES = {
  VOTE_INCLUDED: 'VOTE_INCLUDED',
  RECEIPT_NOT_FOUND: 'RECEIPT_NOT_FOUND',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INTEGRITY_FAILED: 'INTEGRITY_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * Validates if the string is a valid 64-character SHA-256 hexadecimal hash
 * @param {string} hash
 * @returns {boolean}
 */
const isValidSha256Hash = (hash) => {
  return typeof hash === 'string' && /^[a-fA-F0-9]{64}$/.test(hash.trim());
};

/**
 * Fetches the public bulletin board data
 *
 * @param {object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=50]
 * @param {string} [options.search='']
 * @returns {Promise<{ totalVotes: number, page: number, totalPages: number, votes: Array }>}
 */
const getPublicBulletinBoard = async ({ page = 1, limit = 50, search = '' } = {}) => {
  const query = {};

  if (search && typeof search === 'string' && search.trim() !== '') {
    const sanitizedSearch = search.trim();
    // Support prefix or exact matching on receiptHash
    query.receiptHash = { $regex: sanitizedSearch, $options: 'i' };
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (numericPage - 1) * numericLimit;

  // Retrieve total count of votes recorded
  const totalVotes = await Vote.countDocuments(query);
  const totalPages = Math.ceil(totalVotes / numericLimit) || 1;

  // Fetch anonymous public vote receipts (never expose sensitive private voter identity)
  const votes = await Vote.find(query, 'receiptHash candidateId timestamp')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(numericLimit)
    .lean();

  return {
    totalVotes,
    page: numericPage,
    totalPages,
    limit: numericLimit,
    votes,
  };
};

/**
 * Verifies a vote receipt hash against the stored database record
 *
 * Verification Pipeline:
 *  1. Format check: Ensures the receipt is a valid 64-char SHA-256 hex string
 *  2. DB search: Looks up ballot record by receiptHash
 *  3. Cryptographic integrity check: Recomputes SHA-256 hash from (encryptedVote:iv:candidateId)
 *     and compares with the claimed receiptHash.
 *
 * @param {string} receiptHash - The SHA-256 hash provided on the voter's receipt
 * @returns {Promise<{ valid: boolean, code: string, status: string, message: string, receiptHash: string, timestamp?: Date, candidateId?: string }>}
 */
const verifyVoteReceipt = async (receiptHash) => {
  if (!receiptHash || typeof receiptHash !== 'string') {
    return {
      valid: false,
      code: VERIFICATION_CODES.INVALID_FORMAT,
      status: 'Not verified',
      message: 'Receipt hash is required',
      receiptHash: receiptHash || '',
    };
  }

  const trimmedHash = receiptHash.trim().toLowerCase();

  if (!isValidSha256Hash(trimmedHash)) {
    return {
      valid: false,
      code: VERIFICATION_CODES.INVALID_FORMAT,
      status: 'Not verified',
      message: 'Invalid receipt hash format. Must be a 64-character SHA-256 hexadecimal string.',
      receiptHash: trimmedHash,
    };
  }

  const vote = await Vote.findOne({ receiptHash: trimmedHash }).lean();

  if (!vote) {
    return {
      valid: false,
      code: VERIFICATION_CODES.RECEIPT_NOT_FOUND,
      status: 'Not verified',
      message: 'Vote not found. This receipt hash does not exist in the recorded ballot database.',
      receiptHash: trimmedHash,
    };
  }

  // Cryptographic integrity verification:
  // Re-hash the stored encrypted vote, IV, and candidateId to verify the database entry is untampered
  const expectedHash = hashValue(`${vote.encryptedVote}:${vote.iv}:${vote.candidateId}`).toLowerCase();

  if (expectedHash !== trimmedHash) {
    return {
      valid: false,
      code: VERIFICATION_CODES.INTEGRITY_FAILED,
      status: 'Tampered vote record',
      message: 'Integrity check failed: Ballot record contents do not match receipt hash.',
      receiptHash: trimmedHash,
    };
  }

  return {
    valid: true,
    code: VERIFICATION_CODES.VOTE_INCLUDED,
    status: 'Vote included',
    message: 'Vote included and cryptographically verified in ballot database.',
    receiptHash: trimmedHash,
    candidateId: vote.candidateId,
    timestamp: vote.timestamp,
  };
};

/**
 * Returns overall bulletin board summary statistics
 * @returns {Promise<{ totalVotes: number, latestVoteTimestamp: Date|null }>}
 */
const getBulletinBoardStats = async () => {
  const totalVotes = await Vote.countDocuments();
  const latestVote = await Vote.findOne({}, 'timestamp').sort({ timestamp: -1 }).lean();

  return {
    totalVotes,
    latestVoteTimestamp: latestVote ? latestVote.timestamp : null,
  };
};

module.exports = {
  VERIFICATION_CODES,
  isValidSha256Hash,
  getPublicBulletinBoard,
  verifyVoteReceipt,
  getBulletinBoardStats,
};
