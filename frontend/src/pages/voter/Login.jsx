import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginVoter } from '../../services/authService';
import { clearAuth } from '../../utils/tokenStorage';
import ErrorMessage from '../../components/ErrorMessage';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ voterId: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      clearAuth();
      const result = await loginVoter(form);
      // Never save a JWT after the password step. Only the OTP step can return one.
      sessionStorage.setItem('pendingOtp', JSON.stringify({
        voterId: result.voter.voterId, purpose: 'login',
      }));
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="voterId" placeholder="Voter ID" autoComplete="username" required value={form.voterId} onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" autoComplete="current-password" required value={form.password} onChange={handleChange} />
          <button type="submit" disabled={submitting}>{submitting ? 'Checking…' : 'Login'}</button>
        </form>
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default Login;
