const express = require('express');
const { register, login, verifyOTP, logout } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/logout', authenticateJWT, logout);

module.exports = router;
