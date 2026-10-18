import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyOTP, resendRegistrationOTP } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [pending] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pendingOtp') || 'null'); }
    catch { return null; }
  });
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendPassword, setResendPassword] = useState('');
  const [notice, setNotice] = useState(location.state?.otpError
    ? (location.state.otpMessage || 'OTP could not be sent. Try requesting a new one below.') : '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!pending || !['registration', 'login'].includes(pending.purpose)) {
      setError('Your verification session is missing. Please start again.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyOTP({
        voterId: pending.voterId,
        otpCode,
        purpose: pending.purpose,
      });
      if (pending.purpose === 'registration') {
        sessionStorage.removeItem('pendingOtp');
        navigate('/login', { replace: true });
      } else {
        if (!result.token) throw new Error('Login verification returned no session. Please log in again.');
        login({ token: result.token, voterId: pending.voterId });
        sessionStorage.removeItem('pendingOtp');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!pending || pending.purpose !== 'registration') return;
    setSubmitting(true);
    try {
      const result = await resendRegistrationOTP({ voterId: pending.voterId, password: resendPassword });
      setNotice(result.message);
      setResendPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>{pending?.purpose === 'registration' ? 'Verify registration email' : 'Verify login OTP'}</h2>
        {pending ? <p>Enter the 6-digit code for voter ID <strong>{pending.voterId}</strong>. The code expires in 5 minutes.</p>
          : <p>No OTP request found. <Link to="/register">Register</Link> or <Link to="/login">Log in</Link> again.</p>}
        {pending && (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="6-digit OTP" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
            <button type="submit" disabled={submitting}>{submitting ? 'Verifying…' : 'Verify OTP'}</button>
          </form>
        )}
        {notice && <p>{notice}</p>}
        {pending?.purpose === 'registration' && (
          <form onSubmit={handleResend} style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            <label>Need another registration code? Enter your password:</label>
            <input type="password" autoComplete="current-password" required value={resendPassword} onChange={(e) => setResendPassword(e.target.value)} />
            <button type="submit" disabled={submitting}>Resend registration OTP</button>
          </form>
        )}
        {pending?.purpose === 'login' && <p>If the login code expired, <Link to="/login">log in again</Link> to request another one.</p>}
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default OTPVerification;
