const crypto = require('crypto');
const Vote = require('../models/Vote');
const { hashValue } = require('../crypto/sha256');

const normalizeAESKey = (secretKey) => {
  const value = typeof secretKey === 'string' ? secretKey : String(secretKey);

  if (value.length === 32) {
    return Buffer.from(value, 'utf8');
  }

  if (value.length === 64 && /^[0-9a-fA-F]+$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  return crypto.createHash('sha256').update(value).digest();
};

const encryptVotePayload = (votePayload, secretKey) => {
  const iv = crypto.randomBytes(16);
  const key = normalizeAESKey(secretKey);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(votePayload), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedVote: encrypted,
    iv: iv.toString('hex'),
  };
};

const generateReceipt = (encryptedVote, iv, candidateId) => {
  const hashInput = `${encryptedVote}:${iv}:${candidateId}`;
  return hashValue(hashInput);
};

const storeVote = async ({ encryptedVote, iv, candidateId }) => {
  const receiptHash = generateReceipt(encryptedVote, iv, candidateId);

  const vote = await Vote.create({
    encryptedVote,
    iv,
    candidateId,
    receiptHash,
  });

  return { vote, receiptHash };
};

module.exports = {
  encryptVotePayload,
  generateReceipt,
  storeVote,
};
