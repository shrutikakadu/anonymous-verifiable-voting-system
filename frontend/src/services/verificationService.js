import axios from 'axios';

const API_URL = '/api/verification';

/**
 * Fetches the public bulletin board entries
 * @param {object} [params] - { page, limit, search }
 * @returns {Promise<{ success: boolean, totalVotes: number, votes: Array, page: number, totalPages: number }>}
 */
export const fetchBulletinBoard = async (params = {}) => {
  const response = await axios.get(`${API_URL}/bulletin-board`, { params });
  return response.data;
};

/**
 * Fetches bulletin board aggregate statistics (e.g., total recorded votes)
 * @returns {Promise<{ success: boolean, totalVotes: number, latestVoteTimestamp: string }>}
 */
export const fetchVerificationStats = async () => {
  const response = await axios.get(`${API_URL}/stats`);
  return response.data;
};

/**
 * Verifies a vote receipt hash against the backend database
 * @param {string} receiptHash
 * @returns {Promise<{ valid: boolean, status: string, message: string, receiptHash: string, timestamp: string, candidateId?: string }>}
 */
export const verifyReceipt = async (receiptHash) => {
  const trimmed = (receiptHash || '').trim();
  const response = await axios.get(`${API_URL}/${encodeURIComponent(trimmed)}`);
  return response.data;
};
