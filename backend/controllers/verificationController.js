/**
 * verificationController.js
 * --------------------------
 * Part 7 (Shrutika): Bulletin Board + Vote Verification Controller
 *
 * Implements endpoints for:
 *  - GET /api/verification/bulletin-board: Public bulletin board with total votes & pagination/search
 *  - GET /api/verification/stats: Real-time vote count and ledger stats
 *  - GET /api/verification/:receiptHash: Public verification of vote inclusion by receipt hash
 *  - POST /api/verification/verify: POST-based receipt verification
 */

'use strict';

const {
  getPublicBulletinBoard,
  verifyVoteReceipt,
  getBulletinBoardStats,
  VERIFICATION_CODES,
} = require('../services/verificationService');

/**
 * GET /api/verification/bulletin-board
 * Public endpoint to view all anonymous vote receipts and total vote count.
 */
const getBulletinBoard = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await getPublicBulletinBoard({ page, limit, search });

    return res.status(200).json({
      success: true,
      totalVotes: result.totalVotes,
      page: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      votes: result.votes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/verification/stats
 * Public endpoint to fetch total number of recorded votes.
 */
const getStats = async (_req, res, next) => {
  try {
    const stats = await getBulletinBoardStats();
    return res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/verification/:receiptHash
 * Verifies whether a given receipt hash exists and is untampered in the database.
 */
const verifyReceipt = async (req, res, next) => {
  try {
    const { receiptHash } = req.params;
    const result = await verifyVoteReceipt(receiptHash);

    if (!result.valid) {
      const statusCode = result.code === VERIFICATION_CODES.INVALID_FORMAT ? 400 : 404;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/verification/verify
 * Accepts receiptHash in request body for easy frontend form submissions.
 */
const verifyReceiptBody = async (req, res, next) => {
  try {
    const { receiptHash } = req.body;
    const result = await verifyVoteReceipt(receiptHash);

    if (!result.valid) {
      const statusCode = result.code === VERIFICATION_CODES.INVALID_FORMAT ? 400 : 404;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBulletinBoard,
  getStats,
  verifyReceipt,
  verifyReceiptBody,
};
