import voterApi from './voterApi';

export const castVote = async (payload) => (await voterApi.post('/vote/cast', payload)).data;
