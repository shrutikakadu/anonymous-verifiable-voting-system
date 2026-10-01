const express = require('express');
const { generateToken, verifyToken } = require('../controllers/tokenController');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

router.post('/generate', authenticateJWT, generateToken);
router.post('/verify', authenticateJWT, verifyToken);

module.exports = router;
