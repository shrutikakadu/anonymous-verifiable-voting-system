import axios from 'axios';

const API_URL = '/api/auth';

export const registerVoter = async (payload) => {
  const response = await axios.post(`${API_URL}/register`, payload);
  return response.data;
};

export const loginVoter = async (payload) => {
  const response = await axios.post(`${API_URL}/login`, payload);
  return response.data;
};

export const verifyOTP = async (payload) => {
  const response = await axios.post(`${API_URL}/verify-otp`, payload);
  return response.data;
};

export const resendRegistrationOTP = async (payload) => {
  const response = await axios.post(`${API_URL}/resend-registration-otp`, payload);
  return response.data;
};

export const logoutVoter = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/logout`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
