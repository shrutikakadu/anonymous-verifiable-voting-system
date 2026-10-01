import axios from 'axios';

const API_URL = '/api/verification';

export const fetchBulletinBoard = async () => {
  const response = await axios.get(`${API_URL}/bulletin-board`);
  return response.data;
};

export const verifyReceipt = async (receiptHash) => {
  const response = await axios.get(`${API_URL}/${receiptHash}`);
  return response.data;
};
