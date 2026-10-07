const express = require('express');
const {
  getBulletinBoard,
  getStats,
  verifyReceipt,
  verifyReceiptBody,
} = require('../controllers/verificationController');

const router = express.Router();

// Public bulletin board listing
router.get('/bulletin-board', getBulletinBoard);

// Public verification statistics (total votes count)
router.get('/stats', getStats);

// Form verification via POST body
router.post('/verify', verifyReceiptBody);

// Verification via URL parameter
router.get('/:receiptHash', verifyReceipt);

module.exports = router;
