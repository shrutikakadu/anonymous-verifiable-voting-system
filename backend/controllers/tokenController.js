/**
 * tokenController.js
 * ------------------
 * Part 4 (Arya Akhade): Token Verification + Double Vote Prevention
 *
 * Exposes HTTP endpoints for:
 *   POST /api/token/generate  — (Member 3's work, kept here for integration)
 *   POST /api/token/verify    — Full 3-stage verification (Arya's primary work)
 *   POST /api/token/mark-used — Mark token consumed after vote cast (called by Member 6)
 *
 * All endpoints require a valid JWT (authenticateJWT middleware applied in routes).
 */

const fs = require('fs');
const crypto = require('crypto');
const VotingToken = require('../models/VotingToken');
const { signToken, hashToken } = require('../services/tokenService');
const { verifyVotingToken, markTokenAsUsed, VERIFY_RESULT } = require('../services/tokenVerificationService');
const { ensureKeyFiles, getKeyPairPaths } = require('../crypto/keyManager');

// ─────────────────────────────────────────────
// POST /api/token/generate  (Member 3 territory — kept for integration)
// ─────────────────────────────────────────────
const generateToken = async (req, res, next) => {
  try {
    ensureKeyFiles();
    const { privateKeyPath, publicKeyPath } = getKeyPairPaths();

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    const token = crypto.randomBytes(32).toString('hex');
    const signature = signToken(token, privateKey);
    const tokenHash = hashToken(token);

    await VotingToken.create({ tokenHash, used: false });

    return res.status(201).json({
      message: 'Anonymous voting token generated',
      token,
      signature,
      publicKey,
      tokenHash,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/token/verify   (Arya's primary endpoint)
// ─────────────────────────────────────────────
/**
 * Runs the full 3-stage token verification pipeline.
 * Returns a structured response with a result code so clients
 * know exactly WHY a token was rejected.
 *
 * Request body: { token, signature, publicKey }
 *
 * Success  → 200 { valid: true,  code: 'VALID', message }
 * Failure  → 400 / 401 / 409 with { valid: false, code, message }
 */
const verifyToken = async (req, res, next) => {
  try {
    const { token, signature, publicKey } = req.body;

    const { code, tokenRecord } = await verifyVotingToken(token, signature, publicKey);

    switch (code) {
      case VERIFY_RESULT.VALID:
        return res.status(200).json({
          valid: true,
          code,
          message: 'Token is valid and has not been used',
          tokenHash: tokenRecord ? require('../services/tokenService').hashToken(token) : undefined,
        });

      case VERIFY_RESULT.MISSING_FIELDS:
        return res.status(400).json({
          valid: false,
          code,
          message: 'token, signature, and publicKey are all required fields',
        });

      case VERIFY_RESULT.SIGNATURE_INVALID:
        // Fake or tampered token — RSA signature does not match
        return res.status(401).json({
          valid: false,
          code,
          message: 'Token rejected: RSA signature is invalid or token was tampered with',
        });

      case VERIFY_RESULT.TOKEN_NOT_FOUND:
        // Signature was valid but the token was never issued by our server
        return res.status(401).json({
          valid: false,
          code,
          message: 'Token rejected: this token was not issued by our system',
        });

      case VERIFY_RESULT.TOKEN_ALREADY_USED:
        // Replay attack — same token submitted a second time
        return res.status(409).json({
          valid: false,
          code,
          message: 'Token rejected: this voting token has already been used (replay attack prevented)',
          usedAt: tokenRecord ? tokenRecord.usedAt : null,
        });

      default:
        return res.status(500).json({
          valid: false,
          code: VERIFY_RESULT.INTERNAL_ERROR,
          message: 'An internal error occurred during token verification',
        });
    }
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/token/mark-used   (called by Member 6 after vote is stored)
// ─────────────────────────────────────────────
/**
 * Atomically marks a token as used. Protected by JWT.
 * Member 6 (Vote Submission) calls this after successfully storing the vote.
 *
 * Request body: { tokenHash }
 * Returns: 200 on success, 409 if already used (race condition), 400 if missing field.
 */
const markUsed = async (req, res, next) => {
  try {
    const { tokenHash } = req.body;

    if (!tokenHash) {
      return res.status(400).json({ message: 'tokenHash is required' });
    }

    const success = await markTokenAsUsed(tokenHash);

    if (!success) {
      return res.status(409).json({
        message: 'Token was already marked as used — double-vote attempt detected',
        code: VERIFY_RESULT.TOKEN_ALREADY_USED,
      });
    }

    return res.status(200).json({ message: 'Token successfully marked as used', tokenHash });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateToken, verifyToken, markUsed };
