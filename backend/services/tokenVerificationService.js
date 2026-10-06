/**
 * tokenVerificationService.js
 * ----------------------------
 * Part 4 (Arya Akhade): Token Verification + Double Vote Prevention
 *
 * This service handles ALL logic related to:
 *  1. Verifying RSA signatures on voting tokens
 *  2. Hashing received tokens and looking them up in MongoDB
 *  3. Detecting already-used (replayed) tokens
 *  4. Marking tokens as used atomically after a successful vote
 *  5. Rejecting fake/tampered tokens
 *
 * CNS Concepts covered:
 *  - Digital Signature Verification (RSA)
 *  - Integrity (SHA-256 hash comparison)
 *  - Replay Attack Prevention (used-token flag)
 *  - Access Control (only fresh, valid, recognized tokens proceed)
 */

const VotingToken = require('../models/VotingToken');
const { verifyTokenSignature, hashToken } = require('./tokenService');

/**
 * Verification result codes — used internally and returned in API responses
 * so that callers (including tests) can branch on exact failure reasons.
 */
const VERIFY_RESULT = {
  VALID: 'VALID',
  MISSING_FIELDS: 'MISSING_FIELDS',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * verifyVotingToken
 * -----------------
 * Runs the full 3-stage verification pipeline:
 *   Stage 1 — RSA signature verification
 *   Stage 2 — Token hash lookup in DB (existence check)
 *   Stage 3 — Double-vote detection (used flag check)
 *
 * @param {string} token     - Raw hex token string received from voter
 * @param {string} signature - Base64 RSA signature of the token
 * @param {string} publicKey - PEM-encoded RSA public key
 * @returns {Promise<{ code: string, tokenRecord: object|null, tokenHash: string|null }>}
 */
const verifyVotingToken = async (token, signature, publicKey) => {
  // --- Input validation ---
  if (!token || !signature || !publicKey) {
    return { code: VERIFY_RESULT.MISSING_FIELDS, tokenRecord: null, tokenHash: null };
  }

  // --- Stage 1: RSA Signature Verification ---
  // Ensures the token was genuinely issued by our server's private key.
  // A forged or tampered token will fail here.
  let isValidSignature;
  try {
    isValidSignature = verifyTokenSignature(token, signature, publicKey);
  } catch (_err) {
    // crypto.verify throws on malformed keys/signatures
    return { code: VERIFY_RESULT.SIGNATURE_INVALID, tokenRecord: null, tokenHash: null };
  }

  if (!isValidSignature) {
    return { code: VERIFY_RESULT.SIGNATURE_INVALID, tokenRecord: null, tokenHash: null };
  }

  // --- Stage 2: Hash Lookup (Existence Check) ---
  // Compute SHA-256 of the raw token and look it up.
  // If not found, the token was never issued by our system → fake.
  const tokenHash = hashToken(token);
  let tokenRecord;
  try {
    tokenRecord = await VotingToken.findOne({ tokenHash });
  } catch (err) {
    return { code: VERIFY_RESULT.INTERNAL_ERROR, tokenRecord: null, tokenHash };
  }

  if (!tokenRecord) {
    return { code: VERIFY_RESULT.TOKEN_NOT_FOUND, tokenRecord: null, tokenHash };
  }

  // --- Stage 3: Double-Vote / Replay Attack Detection ---
  // If the token has already been consumed, reject the reuse attempt.
  if (tokenRecord.used) {
    return { code: VERIFY_RESULT.TOKEN_ALREADY_USED, tokenRecord, tokenHash };
  }

  // All checks passed — token is valid and fresh
  return { code: VERIFY_RESULT.VALID, tokenRecord, tokenHash };
};

/**
 * markTokenAsUsed
 * ---------------
 * Atomically marks a token as used (consumed) after a successful vote.
 * Uses findOneAndUpdate with a condition check to prevent race conditions
 * where two simultaneous requests with the same token could both pass Stage 3.
 *
 * @param {string} tokenHash - The SHA-256 hash of the raw token
 * @returns {Promise<boolean>} - true if successfully marked, false if token was already used (race condition)
 */
const markTokenAsUsed = async (tokenHash) => {
  const result = await VotingToken.findOneAndUpdate(
    { tokenHash, used: false },   // Only update if currently unused (atomic guard)
    { used: true, usedAt: new Date() },
    { new: true }
  );
  // If result is null, another request already consumed this token
  return result !== null;
};

module.exports = {
  verifyVotingToken,
  markTokenAsUsed,
  VERIFY_RESULT,
};
