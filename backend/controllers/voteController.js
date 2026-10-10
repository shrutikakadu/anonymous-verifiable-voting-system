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

    // AES_SECRET_KEY must be set in the environment as a 64-character hex string.
    const secretKey = process.env.AES_SECRET_KEY;
    if (!secretKey || !/^[0-9a-fA-F]{64}$/.test(secretKey)) {
      return res.status(500).json({ message: 'Internal server configuration error' });
    }

    // encryptAES returns { encryptedVote, iv, authTag, algorithm }.
    // It generates a fresh cryptographically-secure 12-byte IV internally;
    // no IV should be created here.
    const { encryptedVote, iv, authTag } = encryptAES(JSON.stringify(votePayload), secretKey);

    // NOTE (Member 5 → Receipt/Verification owners): The receipt formula is
    // structurally unchanged, but encryptedVote and iv are now the real AES-GCM
    // values. Any existing DB records created by the old code used a discarded
    // external IV in the hash; those receipts will not verify against this path.
    // Coordinate with Members 7/8 before deploying alongside existing data.
    const receiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`);
    const vote = await Vote.create({
      encryptedVote,
      iv,
      authTag,
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
