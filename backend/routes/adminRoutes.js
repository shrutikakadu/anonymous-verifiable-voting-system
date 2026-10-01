const express = require('express');
const { adminLogin, adminDashboard, tallyVotes } = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/authenticateJWT');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/dashboard', authenticateJWT, adminOnly, adminDashboard);
router.post('/tally', authenticateJWT, adminOnly, tallyVotes);

module.exports = router;
