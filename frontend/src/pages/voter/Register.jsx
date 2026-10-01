import { useState } from 'react';
import { registerVoter } from '../../services/authService';
import ErrorMessage from '../../components/ErrorMessage';

function Register() {
  const [form, setForm] = useState({ name: '', voterId: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await registerVoter(form);
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Register</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
          <input name="voterId" placeholder="Voter ID" value={form.voterId} onChange={handleChange} />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} />
          <button type="submit">Register</button>
        </form>
        {message && <div style={{ marginTop: '1rem', color: 'green' }}>{message}</div>}
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default Register;
