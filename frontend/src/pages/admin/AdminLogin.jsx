import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin } from '../../services/adminService';
import { saveToken, saveRole } from '../../utils/tokenStorage';

function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await adminLogin(form);
      saveToken(result.token);
      saveRole('admin');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '480px' }}>
      <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👑</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: '700', color: '#f8fafc' }}>
          Admin Login
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Restricted access — election administrators only
        </p>
      </div>

      <div className="card" style={{ border: '1px solid rgba(167,139,250,0.3)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span className="badge badge-info">👑 RBAC: Admin Role</span>
          <span className="badge badge-info">🔑 JWT Authorization</span>
          <span className="badge badge-info">🔒 bcrypt Verify</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              Admin Username
            </label>
            <input
              name="username"
              placeholder="Enter admin username"
              autoComplete="username"
              value={form.username}
              onChange={(e) => { setForm({ ...form, username: e.target.value }); setError(''); }}
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
              placeholder="Enter admin password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
              style={{ width: '100%' }}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.85rem', background: '#7c3aed' }}>
            {loading ? '⏳ Authenticating...' : '👑 Admin Login'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#475569' }}>
          <Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none' }}>← Voter Login</Link>
        </div>
      </div>

      <div style={{ background: '#0e1626', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px', padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#64748b' }}>
        <strong style={{ color: '#94a3b8' }}>CNS Security (Part 8):</strong> Admin authentication uses bcrypt password verification and issues a JWT with role: "admin". All admin-only routes are protected by JWT middleware + adminOnly RBAC middleware — voters cannot access admin endpoints.
      </div>
    </div>
  );
}

export default AdminLogin;
