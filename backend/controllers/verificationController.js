const Vote = require('../models/Vote');
const { hashValue } = require('../crypto/sha256');

const getBulletinBoard = async (_req, res, next) => {
  try {
    const votes = await Vote.find({}, 'receiptHash candidateId timestamp').sort({ timestamp: -1 });
    return res.json({ votes });
  } catch (error) {
    next(error);
  }
};

const verifyReceipt = async (req, res, next) => {
  try {
    const { receiptHash } = req.params;
    const vote = await Vote.findOne({ receiptHash });

    if (!vote) {
      return res.status(404).json({ message: 'Invalid receipt hash' });
    }

    const expectedHash = hashValue(`${vote.encryptedVote}:${vote.iv}:${vote.candidateId}`);
    const valid = expectedHash === receiptHash;

    return res.json({ valid, receiptHash, candidateId: vote.candidateId, timestamp: vote.timestamp });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBulletinBoard, verifyReceipt };
