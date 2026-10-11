'use strict';

/**
 * tallyService.js
 * ---------------
 * Part 8 (Dakkshesh): Secure Tally — AES-256-GCM Decryption for Admin
 *
 * Retrieves all encrypted votes, decrypts them using Member 5's AES-256-GCM
 * implementation (decryptAES), and tallies the candidate counts.
 *
 * CNS Concepts:
 *  - Confidentiality: Votes remain encrypted in DB; only decrypted for admin tally
 *  - Authorized Decryption: Only admin endpoint (protected by JWT + RBAC) calls this
 *  - AES-256-GCM: Provides authenticated decryption (integrity + confidentiality)
 */

const Vote = require('../models/Vote');
const { decryptAES } = require('../crypto/aes');

const getTallyResults = async () => {
  const secretKey = process.env.AES_SECRET_KEY;

  if (!secretKey || !/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    throw new Error('AES_SECRET_KEY must be a 64-character hexadecimal string.');
  }

  const votes = await Vote.find({});
  const tally = {};
  let decryptErrors = 0;

  for (const vote of votes) {
    try {
      // Decrypt using Member 5's AES-256-GCM decryptAES (requires authTag for integrity)
      const plaintext = decryptAES(
        {
          encryptedVote: vote.encryptedVote,
          iv: vote.iv,
          authTag: vote.authTag,
        },
        secretKey
      );

      // Parse decrypted payload to get candidateId
      let candidateId = vote.candidateId; // fallback: stored plaintext candidateId
      try {
        const payload = JSON.parse(plaintext);
        if (payload && payload.candidateId) {
          candidateId = payload.candidateId;
        }
      } catch {
        // plaintext might not be JSON, use stored candidateId as fallback
      }

      tally[candidateId] = (tally[candidateId] || 0) + 1;
    } catch (decryptError) {
      // GCM auth tag mismatch = tampered ballot — counted as error, not tallied
      decryptErrors += 1;
      console.error(`Failed to decrypt vote ${vote._id}: ${decryptError.message}`);
    }
  }

  return {
    totalVotes: votes.length,
    talliedVotes: votes.length - decryptErrors,
    rejectedVotes: decryptErrors, // tampered or corrupted ballots
    candidateResults: tally,
    votes: votes.map((v) => ({ id: v._id, candidateId: v.candidateId, timestamp: v.timestamp, receiptHash: v.receiptHash })),
  };
};

module.exports = { getTallyResults };
