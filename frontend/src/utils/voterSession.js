// All voter state lives in sessionStorage (cleared when the tab closes).
const SESSION_KEY = 'voterSession';       // { token, voterId } - exists only AFTER the login OTP is verified
const PENDING_KEY = 'pendingOtp';         // { voterId, purpose } - same key the Register page writes
const CREDENTIAL_KEY = 'votingCredential'; // { voterId, token, signature }
const RECEIPT_KEY = 'voterReceipt';       // { voterId, receiptHash }

const read = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};
const write = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));

export const getSession = () => read(SESSION_KEY);
export const saveSession = (session) => write(SESSION_KEY, session);
export const clearSession = () => sessionStorage.removeItem(SESSION_KEY);

export const getPendingOtp = () => read(PENDING_KEY);
export const savePendingOtp = (pending) => write(PENDING_KEY, pending);
export const clearPendingOtp = () => sessionStorage.removeItem(PENDING_KEY);

export const getCredential = () => read(CREDENTIAL_KEY);
export const saveCredential = (credential) => write(CREDENTIAL_KEY, credential);
export const clearCredential = () => sessionStorage.removeItem(CREDENTIAL_KEY);

export const getReceipt = () => read(RECEIPT_KEY);
export const saveReceipt = (receipt) => write(RECEIPT_KEY, receipt);
export const clearReceipt = () => sessionStorage.removeItem(RECEIPT_KEY);

export const decodeJwt = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

export const getExpiryMs = (token) => {
  const payload = decodeJwt(token);
  return payload && payload.exp ? payload.exp * 1000 : 0;
};

export const isExpired = (token) => getExpiryMs(token) <= Date.now();
