import axios from 'axios';
import { clearSession, getSession } from '../utils/voterSession';

export const SESSION_EXPIRED_EVENT = 'voter:session-expired';

// Vite proxies /api to the backend (see vite.config.js), so no CORS setup is needed in dev.
const voterApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Attach the login JWT to protected calls only.
// Public verification calls must NOT carry the voter's identity.
voterApi.interceptors.request.use((config) => {
  const session = getSession();
  const isPublic = (config.url || '').startsWith('/verification');
  if (session && session.token && !isPublic) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// Only these backend messages mean "the login session is dead".
// /vote/cast also returns 401 for a bad voting-token signature, which must NOT log the voter out.
const SESSION_FAILURE = /JWT|OTP verification required/i;

voterApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error.config && error.config.url) || '';
    const message = (error.response && error.response.data && error.response.data.message) || '';
    const isSessionFailure =
      error.response &&
      error.response.status === 401 &&
      !url.startsWith('/auth/') &&
      SESSION_FAILURE.test(message);

    if (isSessionFailure && getSession()) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
  if (!error.response) return 'Cannot reach the server. Check that the backend is running.';
  return (error.response.data && error.response.data.message) || fallback;
};

export default voterApi;
