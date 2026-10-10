/**
 * tokenController.js
 * ------------------
 * Part 3 (Anush): RSA Anonymous Voting Token Generation   <-- generateToken
 * Part 4 (Arya Akhade): Token Verification + Double Vote Prevention
 *
 * Exposes HTTP endpoints for:
 *   POST /api/token/generate  — Generate an RSA-signed anonymous voting token (Part 3)
 *   POST /api/token/verify    — Full 3-stage verification (Part 4)
 *   POST /api/token/mark-used — Mark token consumed after vote cast (Part 6 integration)
 *
 * All endpoints require a valid JWT (authenticateJWT middleware applied in routes).
 */

const fs = require('fs');
const VotingToken = require('../models/VotingToken');
const Voter = require('../models/Voter');
const { signToken, hashToken, generateSecureToken } = require('../services/tokenService');
const { verifyVotingToken, markTokenAsUsed, VERIFY_RESULT } = require('../services/tokenVerificationService');
const { ensureKeyFiles, getKeyPairPaths } = require('../crypto/keyManager');

// ─────────────────────────────────────────────
// POST /api/token/generate  (Part 3 — RSA Anonymous Voting Token)
// ─────────────────────────────────────────────
/**
 * Issues a single anonymous RSA-signed voting token to an authenticated, eligible voter.
 *
 * Security guarantees enforced here:
 *   1. Voter must be authenticated via JWT (enforced in tokenRoutes.js).
 *   2. Voter must have verified their OTP (voter.otpVerified === true).
 *   3. Voter must be marked eligible (voter.isEligible === true).
 *   4. Voter must not have already received a token (voter.hasReceivedToken === false).
 *      An atomic findOneAndUpdate prevents two concurrent requests from both passing.
 *   5. Raw token is NEVER stored — only its SHA-256 hash enters VotingToken.
 *   6. No voter identity is written to VotingToken. Anonymity boundary is maintained.
 *   7. RSA private key is read from disk server-side and never returned to the client.
 */
const generateToken = async (req, res, next) => {
  try {
    // ── Step 1: Load the authenticated voter ─────────────────────────────────
    // req.user is set by authenticateJWT; sub is the voter's MongoDB _id string.
    const voter = await Voter.findById(req.user.sub);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // ── Step 2: OTP verification check ───────────────────────────────────────
    if (!voter.otpVerified) {
      return res.status(403).json({
        message: 'OTP verification required before a voting token can be issued',
      });
    }

    // ── Step 3: Eligibility check ─────────────────────────────────────────────
    if (!voter.isEligible) {
      return res.status(403).json({
        message: 'Voter is not eligible to receive a voting token',
      });
    }

    // ── Step 4: Atomic duplicate-issuance prevention ──────────────────────────
    // Only one successful update is possible: the filter matches only when
    // hasReceivedToken is still false.  Concurrent requests will find no document
    // and receive null, which we treat as "already issued".
    const claimed = await Voter.findOneAndUpdate(
      { _id: req.user.sub, hasReceivedToken: false },
      { $set: { hasReceivedToken: true } },
      { new: false }
    );

    if (!claimed) {
      return res.status(409).json({
        message: 'A voting token has already been issued for this voter',
      });
    }

    // ── Step 5: Load RSA key pair from disk ───────────────────────────────────
    // ensureKeyFiles() creates SPKI/PKCS#8 PEM keys if missing (via rsa.js).
    ensureKeyFiles();
    const { privateKeyPath, publicKeyPath } = getKeyPairPaths();
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey  = fs.readFileSync(publicKeyPath,  'utf8');

    // ── Step 6: Generate token, sign it, and hash it ──────────────────────────
    const rawToken  = generateSecureToken();           // crypto.randomBytes(32) → hex
    const signature = signToken(rawToken, privateKey); // RSA-SHA256, output base64
    const tokenHash = hashToken(rawToken);             // SHA-256 hex digest

    // ── Step 7: Persist only the hash (never the raw token) ──────────────────
    // VotingToken has NO reference to Voter — anonymity is preserved.
    await VotingToken.create({ tokenHash, used: false });

    // ── Step 8: Return token, signature, and public key ───────────────────────
    // tokenHash is included per the existing API contract used by Part 4 & frontend.
    // The private key is never included in any response.
    return res.status(201).json({
      message: 'Anonymous voting token generated',
      token:     rawToken,
      signature,
      publicKey,
      tokenHash,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/token/verify   (Part 4 — Arya Akhade)
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
// POST /api/token/mark-used   (Part 6 integration — called after vote is stored)
// ─────────────────────────────────────────────
/**
 * Atomically marks a token as used. Protected by JWT.
 * Part 6 (Vote Submission) calls this after successfully storing the vote.
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
