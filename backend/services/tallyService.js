
'use strict';

const Vote = require('../models/Vote');
const { decryptAES } = require('../crypto/aes');

const getTallyResults = async () => {
  const secretKey = process.env.AES_SECRET_KEY;

  // Validate the AES-256 key before processing any votes.
  if (
    typeof secretKey !== 'string' ||
    !/^[0-9a-fA-F]{64}$/.test(secretKey)
  ) {
    throw new Error(
      'AES_SECRET_KEY must be a 64-character hexadecimal string.'
    );
  }

  // Load only fields required for secure decryption and tallying.
  // Do not load the plaintext candidateId into the tallying process.
  const votes = await Vote.find(
    {},
    'encryptedVote iv authTag'
  ).lean();

  const candidateCounts = new Map();
  let rejectedVotes = 0;

  for (const vote of votes) {
    try {
      // AES-GCM verifies the authentication tag during decryption.
      const plaintext = decryptAES(
        {
          encryptedVote: vote.encryptedVote,
          iv: vote.iv,
          authTag: vote.authTag
        },
        secretKey
      );

      // Never use the plaintext database candidateId as a fallback.
      const payload = JSON.parse(plaintext);

      if (
        payload === null ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
      ) {
        throw new Error('Invalid decrypted vote payload.');
      }

      const candidateId = payload.candidateId;

// Only accept the three configured candidates.
// Never fall back to the plaintext database candidateId.
if (!['c1', 'c2', 'c3'].includes(candidateId)) {
  throw new Error('Invalid candidate ID in decrypted vote.');
}

candidateCounts.set(
  candidateId,
  (candidateCounts.get(candidateId) || 0) + 1
);
    } catch {
      // Do not count ballots that fail decryption or payload validation.
      rejectedVotes += 1;

      // Log only the vote record ID, not its contents or plaintext choice.
      console.warn(
        `Vote ${vote._id} was rejected during tally verification.`
      );
    }
  }

  return {
    totalVotes: votes.length,
    talliedVotes: votes.length - rejectedVotes,
    rejectedVotes,
    candidateResults: Object.fromEntries(candidateCounts)
  };
};

module.exports = { getTallyResults };
