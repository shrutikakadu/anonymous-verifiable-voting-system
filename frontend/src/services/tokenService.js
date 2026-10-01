import axios from 'axios';

const API_URL = '/api/token';

export const generateVotingToken = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/generate`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
