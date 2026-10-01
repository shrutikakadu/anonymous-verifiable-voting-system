import { useState } from 'react';
import { loginVoter } from '../../services/authService';
import { saveToken, saveRole } from '../../utils/tokenStorage';
import ErrorMessage from '../../components/ErrorMessage';

function Login() {
  const [form, setForm] = useState({ voterId: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await loginVoter(form);
      saveToken(result.token);
      saveRole('voter');
      window.location.href = '/verify-otp';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="voterId" placeholder="Voter ID" value={form.voterId} onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} />
          <button type="submit">Login</button>
        </form>
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default Login;
