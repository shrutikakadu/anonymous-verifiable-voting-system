import voterApi from './voterApi';

export const generateVotingToken = async () => (await voterApi.post('/token/generate')).data;

export const verifyVotingToken = async (token, signature) =>
  (await voterApi.post('/token/verify', { token, signature })).data;
