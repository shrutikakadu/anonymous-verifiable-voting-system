import axios from 'axios';

const API_URL = '/api/admin';

export const adminLogin = async (payload) => {
  const response = await axios.post(`${API_URL}/login`, payload);
  return response.data;
};

export const fetchAdminDashboard = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
