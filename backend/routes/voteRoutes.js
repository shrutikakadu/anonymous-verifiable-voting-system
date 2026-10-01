const express = require('express');
const { castVote } = require('../controllers/voteController');
const { authenticateJWT } = require('../middleware/authenticateJWT');

const router = express.Router();

router.post('/cast', authenticateJWT, castVote);

module.exports = router;
