import { useState } from 'react';
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
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Register</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="name" placeholder="Name" autoComplete="name" required maxLength={100} value={form.name} onChange={handleChange} />
          <input name="voterId" placeholder="Voter ID" autoComplete="username" required minLength={3} maxLength={64} value={form.voterId} onChange={handleChange} />
          <input name="email" type="email" placeholder="Email" autoComplete="email" required value={form.email} onChange={handleChange} />
          <input name="password" type="password" placeholder="Password (at least 8 characters)" autoComplete="new-password" required minLength={8} value={form.password} onChange={handleChange} />
          <button type="submit" disabled={submitting}>{submitting ? 'Registering…' : 'Register'}</button>
        </form>
        {message && <div style={{ marginTop: '1rem', color: 'green' }}>{message}</div>}
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default Register;
