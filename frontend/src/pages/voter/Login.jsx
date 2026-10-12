import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginVoter } from '../../services/authService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import { savePendingOtp } from '../../utils/voterSession';
import ErrorMessage from '../../components/ErrorMessage';

function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ voterId: '', password: '' });
  const [error, setError] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNeedsEmailVerification(false);

    if (!form.voterId.trim() || !form.password) {
      setError('Enter your voter ID and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginVoter({ voterId: form.voterId.trim(), password: form.password });
      // No JWT yet. The backend issues it only after the login OTP is verified.
      savePendingOtp({ voterId: result.voter.voterId, purpose: 'login' });
      navigate('/verify-otp');
    } catch (err) {
      if (err.response && err.response.status === 403) setNeedsEmailVerification(true);
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const goToRegistrationOtp = () => {
    savePendingOtp({ voterId: form.voterId.trim().toUpperCase(), purpose: 'registration' });
    navigate('/verify-otp');
  };

  const state = location.state || {};

  return (
    <div className="container">
      <div className="card">
        <h2>Login</h2>
        {state.reason === 'expired' && (
          <div style={{ color: '#fbbf24', marginBottom: '1rem' }}>Your session expired. Log in again to continue.</div>
        )}
        {state.registered && (
          <div style={{ color: '#34d399', marginBottom: '1rem' }}>Email verified. Log in to continue.</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="voterId" placeholder="Voter ID" autoComplete="username" value={form.voterId} onChange={handleChange} disabled={loading} />
          <input name="password" type="password" placeholder="Password" autoComplete="current-password" value={form.password} onChange={handleChange} disabled={loading} />
          <button type="submit" disabled={loading}>{loading ? 'Checking...' : 'Login'}</button>
        </form>
        <ErrorMessage message={error} />
        {needsEmailVerification && (
          <p>
            <button type="button" className="btn-outline" onClick={goToRegistrationOtp}>Enter registration code</button>
          </p>
        )}
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
