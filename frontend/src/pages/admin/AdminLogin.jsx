import { useState } from 'react';
import { adminLogin } from '../../services/adminService';
import { saveToken, saveRole } from '../../utils/tokenStorage';

function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await adminLogin(form);
      saveToken(result.token);
      saveRole('admin');
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input name="username" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="submit">Login</button>
        </form>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </div>
    </div>
  );
}

export default AdminLogin;
