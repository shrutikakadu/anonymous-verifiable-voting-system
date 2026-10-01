const express = require('express');
const { getBulletinBoard, verifyReceipt } = require('../controllers/verificationController');

const router = express.Router();

router.get('/bulletin-board', getBulletinBoard);
router.get('/:receiptHash', verifyReceipt);

module.exports = router;
