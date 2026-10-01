const Vote = require('../models/Vote');
const VotingToken = require('../models/VotingToken');
const Voter = require('../models/Voter');
const { hashValue } = require('../crypto/sha256');
const { encryptAES } = require('../crypto/aes');
const { encryptVotePayload, storeVote } = require('../services/voteService');
const { jwtSecret } = require('../config/keys');

const castVote = async (req, res, next) => {
  try {
    const { token, candidateId, votePayload } = req.body;

    if (!token || !candidateId || !votePayload) {
      return res.status(400).json({ message: 'Token, candidate, and vote payload are required' });
    }

    const tokenHash = hashValue(token);
    const tokenRecord = await VotingToken.findOne({ tokenHash });

    if (!tokenRecord || tokenRecord.used) {
      return res.status(409).json({ message: 'Voting token is invalid or already used' });
    }

    const voter = await Voter.findById(req.user.sub);
    if (!voter || voter.hasVoted) {
      return res.status(403).json({ message: 'Voter cannot vote again' });
    }

    const secretKey = process.env.AES_SECRET_KEY || '12345678901234567890123456789012';
    const iv = require('crypto').randomBytes(16).toString('hex');
    const encryptedVote = encryptAES(JSON.stringify(votePayload), secretKey, iv);

    const receiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`);
    const vote = await Vote.create({
      encryptedVote,
      iv,
      candidateId,
      receiptHash,
    });

    tokenRecord.used = true;
    tokenRecord.usedAt = new Date();
    await tokenRecord.save();

    voter.hasVoted = true;
    await voter.save();

    return res.status(201).json({
      message: 'Vote cast successfully',
      receiptHash,
      voteId: vote._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { castVote };
