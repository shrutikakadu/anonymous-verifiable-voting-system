import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginVoter } from '../../services/authService';
import { saveToken, saveRole, saveVoterId } from '../../utils/tokenStorage';
import ErrorMessage from '../../components/ErrorMessage';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ voterId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.voterId.trim() || !form.password) {
      setError('Both Voter ID and password are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await loginVoter(form);
      saveToken(result.token);
      saveRole('voter');
      saveVoterId(form.voterId.toUpperCase());
      // Store voterId for OTP verification step
      sessionStorage.setItem('pendingVoterId', form.voterId.toUpperCase());
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc' }}>
          Voter Login
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Authenticate to access the secure voting system
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span className="badge badge-info">🔒 bcrypt Password Verify</span>
          <span className="badge badge-info">🎫 JWT Session</span>
          <span className="badge badge-info">📱 2FA OTP Next</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Voter ID
            </label>
            <input
              name="voterId"
              placeholder="Enter your Voter ID"
              autoComplete="username"
              value={form.voterId}
              onChange={handleChange}
              style={{ width: '100%' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              style={{ width: '100%' }}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: '0.25rem', padding: '0.85rem' }}>
            {loading ? '⏳ Logging in...' : '🔐 Login'}
          </button>
        </form>

        <ErrorMessage message={error} />

        <div style={{ marginTop: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}>
            Register here
          </Link>
        </div>
      </div>

      <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#64748b', lineHeight: '1.6' }}>
        <strong style={{ color: '#94a3b8' }}>CNS Security:</strong> Password verified using bcrypt (Part 1). Successful login issues a JWT (Part 2). OTP verification follows for 2FA authentication.
      </div>
    </div>
  );
}

export default Login;
