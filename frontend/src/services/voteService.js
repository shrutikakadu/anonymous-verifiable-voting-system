import axios from 'axios';

const API_URL = '/api/vote';

export const castVote = async (payload) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/cast`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
