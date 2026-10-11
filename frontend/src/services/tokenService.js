import axios from 'axios';

const API_URL = '/api/token';

export const generateVotingToken = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/generate`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const verifyVotingToken = async (token, signature) => {
  const authToken = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/verify`,
    { token, signature },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  return response.data;
};
