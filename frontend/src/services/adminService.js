import axios from 'axios';

const API_URL = '/api/admin';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const adminLogin = async (payload) => {
  const response = await axios.post(`${API_URL}/login`, payload);
  return response.data;
};

export const fetchAdminDashboard = async () => {
  const response = await axios.get(`${API_URL}/dashboard`, getAuthHeader());
  return response.data;
};

export const fetchTallyResults = async () => {
  const response = await axios.post(`${API_URL}/tally`, {}, getAuthHeader());
  return response.data;
};
