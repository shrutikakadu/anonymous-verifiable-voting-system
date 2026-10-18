import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutVoter } from '../services/authService';
import { SESSION_EXPIRED_EVENT } from '../services/voterApi';
import {
  clearCredential,
  clearPendingOtp,
  clearReceipt,
  clearSession,
  getCredential,
  getExpiryMs,
  getReceipt,
  getSession,
  isExpired,
  saveCredential,
  saveReceipt,
  saveSession,
} from '../utils/voterSession';

const AuthContext = createContext(null);

const loadSession = () => {
  const stored = getSession();
  if (!stored || !stored.token || isExpired(stored.token)) {
    clearSession();
    return null;
  }
  return stored;
};

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(loadSession);
  const [credential, setCredential] = useState(getCredential);
  const [receiptRecord, setReceiptRecord] = useState(getReceipt);

  const endSession = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Called only after the LOGIN OTP is verified (that is when the backend issues the JWT).
  const login = useCallback(({ token, voterId }) => {
    // A different voter on the same tab must not inherit the previous voter's token or receipt.
    const storedCredential = getCredential();
    if (storedCredential && storedCredential.voterId !== voterId) {
      clearCredential();
      setCredential(null);
    }
    const storedReceipt = getReceipt();
    if (storedReceipt && storedReceipt.voterId !== voterId) {
      clearReceipt();
      setReceiptRecord(null);
    }
    const next = { token, voterId };
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    let logoutWarning;
    try {
      await logoutVoter(); // revokes the JWT on the server
    } catch (error) {
      // An expired/revoked token is already unusable. Other failures must not
      // imply server revocation succeeded, even though we clear this device.
      if (error.response?.status !== 401) {
        logoutWarning = 'Signed out on this device, but the server could not confirm logout. Your previous session may remain active until it expires.';
      }
    }
    endSession();
    clearReceipt();
    setReceiptRecord(null);
    clearPendingOtp();
    navigate('/login', { replace: true, state: { logoutWarning } });
  }, [endSession, navigate]);

  const expireSession = useCallback(() => {
    endSession();
    navigate('/login', { replace: true, state: { reason: 'expired' } });
  }, [endSession, navigate]);

  // The backend allows ONE token per voter, so the token must survive a page refresh
  // (sessionStorage) or the voter would be locked out. It is cleared after a successful vote.
  const setVotingCredential = useCallback(({ token, signature }) => {
    const stored = getSession();
    if (!stored) return;
    const next = { voterId: stored.voterId, token, signature };
    saveCredential(next);
    setCredential(next);
  }, []);

  const clearVotingCredential = useCallback(() => {
    clearCredential();
    setCredential(null);
  }, []);

  const setReceipt = useCallback((receiptHash) => {
    const stored = getSession();
    if (!stored) return;
    const next = { voterId: stored.voterId, receiptHash };
    saveReceipt(next);
    setReceiptRecord(next);
  }, []);

  // Axios interceptor fires this when a protected call returns a JWT failure.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [expireSession]);

  // Auto-logout at the JWT's exp time, even if the user makes no requests.
  useEffect(() => {
    if (!session || !session.token) return undefined;
    const delay = getExpiryMs(session.token) - Date.now();
    if (delay <= 0) {
      expireSession();
      return undefined;
    }
    const timerId = setTimeout(expireSession, delay);
    return () => clearTimeout(timerId);
  }, [session, expireSession]);

  const value = useMemo(() => {
    const mine = (record) => (record && session && record.voterId === session.voterId ? record : null);
    return {
      session,
      isAuthenticated: Boolean(session),
      voterId: session ? session.voterId : null,
      expiresAt: session ? getExpiryMs(session.token) : 0,
      login,
      logout,
      votingCredential: mine(credential),
      setVotingCredential,
      clearVotingCredential,
      receipt: mine(receiptRecord),
      setReceipt,
    };
  }, [session, credential, receiptRecord, login, logout, setVotingCredential, clearVotingCredential, setReceipt]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
