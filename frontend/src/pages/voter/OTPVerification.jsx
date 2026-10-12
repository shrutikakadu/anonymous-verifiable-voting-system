import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { verifyOTP, resendRegistrationOTP } from '../../services/authService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import { clearPendingOtp, getPendingOtp } from '../../utils/voterSession';
import ErrorMessage from '../../components/ErrorMessage';

function OTPVerification() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending] = useState(getPendingOtp);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendPassword, setResendPassword] = useState('');
  const [notice, setNotice] = useState(
    location.state && location.state.otpError ? 'The OTP could not be sent. Request a new one below.' : ''
  );

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const hasPending = Boolean(pending && pending.voterId && ['registration', 'login'].includes(pending.purpose));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!hasPending) {
      setError('Your verification session is missing. Please start again.');
      return;
    }
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyOTP({ voterId: pending.voterId, otpCode: code, purpose: pending.purpose });

      if (pending.purpose === 'registration') {
        clearPendingOtp();
        navigate('/login', { replace: true, state: { registered: true } });
        return;
      }

      if (!result.token) {
        setError('Login was verified but the server returned no session. Tell the backend team.');
        return;
      }
      clearPendingOtp();
      login({ token: result.token, voterId: pending.voterId });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'OTP verification failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!hasPending || pending.purpose !== 'registration') return;
    setSubmitting(true);
    try {
      const result = await resendRegistrationOTP({ voterId: pending.voterId, password: resendPassword });
      setNotice(result.message);
      setResendPassword('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resend the OTP'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>{hasPending && pending.purpose === 'registration' ? 'Verify registration email' : 'Verify login OTP'}</h2>
        {hasPending ? (
          <p>Enter the 6-digit code for voter ID <strong>{pending.voterId}</strong>. The code expires in 5 minutes.</p>
        ) : (
          <p>No OTP request found. <Link to="/register">Register</Link> or <Link to="/login">log in</Link> again.</p>
        )}

        {hasPending && (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <input
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="6-digit OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              disabled={submitting}
              autoFocus
            />
            <button type="submit" disabled={submitting}>{submitting ? 'Verifying...' : 'Verify OTP'}</button>
          </form>
        )}

        {notice && <p style={{ color: '#34d399' }}>{notice}</p>}
        <ErrorMessage message={error} />

        {hasPending && pending.purpose === 'registration' && (
          <form onSubmit={handleResend} style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
            <label>Need another registration code? Enter your password:</label>
            <input type="password" autoComplete="current-password" value={resendPassword} onChange={(e) => setResendPassword(e.target.value)} disabled={submitting} />
            <button type="submit" className="btn-secondary" disabled={submitting || !resendPassword}>Resend registration OTP</button>
          </form>
        )}
        {hasPending && pending.purpose === 'login' && (
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Code expired? <Link to="/login">Log in again</Link> to get a new one.</p>
        )}
      </div>
    </div>
  );
}

export default OTPVerification;
