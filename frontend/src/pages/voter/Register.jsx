import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerVoter } from '../../services/authService';
import ErrorMessage from '../../components/ErrorMessage';

function Register() {
  const [form, setForm] = useState({ name: '', voterId: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const result = await registerVoter(form);
      setMessage(result.message || 'Registration successful! You may now log in.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc' }}>
          Voter Registration
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Enroll as an eligible voter in the cryptographic election system
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span className="badge badge-info">🛡️ Salted Password Hashing</span>
          <span className="badge badge-success">✓ Zero Duplicate Voter ID</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Full Name
            </label>
            <input
              name="name"
              placeholder="e.g. Jane Doe"
              autoComplete="name"
              required
              maxLength={100}
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Voter ID
            </label>
            <input
              name="voterId"
              placeholder="Unique Voter Identifier (min 3 chars)"
              autoComplete="username"
              required
              minLength={3}
              maxLength={64}
              value={form.voterId}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Email Address (for 2FA OTP)
            </label>
            <input
              name="email"
              type="email"
              placeholder="voter@example.com"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Password (min 8 characters)
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" disabled={submitting} style={{ marginTop: '0.5rem', width: '100%' }}>
            {submitting ? 'Registering…' : 'Create Voter Account'}
          </button>
        </form>

        {message && (
          <div style={{ marginTop: '1rem', padding: '0.8rem 1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.9rem' }}>
            ✓ {message}
          </div>
        )}

        <ErrorMessage message={error} />

        <div style={{ marginTop: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
