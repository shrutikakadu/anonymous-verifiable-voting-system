import voterApi from './voterApi';

export const registerVoter = async (payload) => (await voterApi.post('/auth/register', payload)).data;
export const loginVoter = async (payload) => (await voterApi.post('/auth/login', payload)).data;
export const verifyOTP = async (payload) => (await voterApi.post('/auth/verify-otp', payload)).data;
export const resendRegistrationOTP = async (payload) =>
  (await voterApi.post('/auth/resend-registration-otp', payload)).data;
export const logoutVoter = async () => (await voterApi.post('/auth/logout')).data;
