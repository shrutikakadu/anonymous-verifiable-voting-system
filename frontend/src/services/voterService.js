import voterApi from './voterApi';

export const getVoterProfile = async () => (await voterApi.get('/voter/profile')).data;
