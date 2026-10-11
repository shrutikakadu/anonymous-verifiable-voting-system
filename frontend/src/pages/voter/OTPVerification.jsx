import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyOTP } from '../../services/authService';
import ErrorMessage from '../../components/ErrorMessage';

function OTPVerification() {
  const navigate = useNavigate();
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [voterId, setVoterId] = useState('');

  useEffect(() => {
    // Get voterId from session (set during login)
    const id = sessionStorage.getItem('pendingVoterId') || localStorage.getItem('voterId') || '';
    setVoterId(id);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!voterId) {
      setError('Session expired. Please log in again.');
      return;
    }
    if (!otpCode.trim()) {
      setError('Please enter your OTP code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyOTP({ voterId, otpCode: otpCode.trim() });
      setMessage(result.message);
      sessionStorage.removeItem('pendingVoterId');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please check the code sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc' }}>
          OTP Verification
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Two-factor authentication — enter the code sent to your registered email address
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span className="badge badge-info">📧 Email OTP (2FA)</span>
          <span className="badge badge-info">🛡️ Two-Factor Auth</span>
        </div>

        {voterId && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '6px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Voter ID: <strong style={{ color: '#38bdf8' }}>{voterId}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              OTP Code (from email)
            </label>
            <input
              type="text"
              placeholder="Enter 6-digit OTP code"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value); setError(''); }}
              maxLength={10}
              style={{ width: '100%', letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.1rem' }}
              autoComplete="one-time-code"
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.85rem' }}>
            {loading ? '⏳ Verifying...' : '✓ Verify OTP'}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.9rem' }}>
            ✅ {message}
          </div>
        )}
        <ErrorMessage message={error} />

        <div style={{ marginTop: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
          Didn't receive the OTP? Check your spam folder or{' '}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/login')}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem', display: 'inline' }}
          >
            Login Again
          </button>
        </div>
      </div>

      <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
        <strong style={{ color: '#94a3b8' }}>CNS Security (Part 2):</strong> OTP is a one-time password sent via email (Nodemailer). This implements Two-Factor Authentication (2FA) / Multi-Factor Authentication (MFA) to prevent unauthorized access even if the password is compromised.
      </div>
    </div>
  );
}

export default OTPVerification;
