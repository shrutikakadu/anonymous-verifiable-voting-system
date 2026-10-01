const express = require('express');
const { getVoterProfile } = require('../controllers/voterController');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

router.get('/profile', authenticateJWT, getVoterProfile);

module.exports = router;
