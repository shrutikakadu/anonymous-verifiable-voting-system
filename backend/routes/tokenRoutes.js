/**
 * tokenRoutes.js
 * --------------
 * Part 4 (Arya Akhade): Token Verification + Double Vote Prevention
 *
 * Routes:
 *   POST /api/token/generate   — Generate anonymous RSA-signed token (Member 3 integration)
 *   POST /api/token/verify     — Verify token: signature + existence + replay check
 *   POST /api/token/mark-used  — Atomically mark token as consumed (Member 6 integration)
 *
 * All routes require a valid JWT session (authenticateJWT middleware).
 */

const express = require('express');
const { generateToken, verifyToken, markUsed } = require('../controllers/tokenController');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

// Protected: voter must be logged in with a valid JWT to interact with tokens
router.post('/generate', authenticateJWT, generateToken);
router.post('/verify', authenticateJWT, verifyToken);
router.post('/mark-used', authenticateJWT, markUsed);

module.exports = router;
