const Vote = require('../models/Vote');

const getTallyResults = async () => {
  const votes = await Vote.find({});

  const tally = {};

  for (const vote of votes) {
    const candidateId = vote.candidateId || 'unknown';
    tally[candidateId] = (tally[candidateId] || 0) + 1;
  }

  return {
    totalVotes: votes.length,
    candidateResults: tally,
    votes,
  };
};

module.exports = { getTallyResults };
