const crypto = require('crypto');

const generateReceipt = (votePayload, candidateId) => {
  const payload = JSON.stringify({ votePayload, candidateId, createdAt: new Date().toISOString() });
  return crypto.createHash('sha256').update(payload).digest('hex');
};

module.exports = { generateReceipt };
