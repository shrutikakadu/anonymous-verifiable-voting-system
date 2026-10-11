import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAdminDashboard } from '../../services/adminService';
import { clearAuth } from '../../utils/tokenStorage';

function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ totalVotes: 0, talliedVotes: 0, rejectedVotes: 0, candidateResults: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminDashboard()
      .then((result) => setData(result))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  const candidateNames = { c1: 'Candidate A', c2: 'Candidate B', c3: 'Candidate C' };
  const totalTallied = data.talliedVotes || data.totalVotes || 0;
  const results = data.candidateResults || {};

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a0f2e, #160f2e)', border: '1px solid rgba(167,139,250,0.3)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>👑</span>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc' }}>Admin Dashboard</h1>
              <span className="badge badge-info">Part 8: Dakkshesh</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success">✓ Admin Authorized</span>
              <span className="badge badge-info">🔑 RBAC: admin role</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* CNS Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🛡️ Authorization (RBAC)</span>
        <span className="badge badge-info">🔒 AES-256-GCM Decryption</span>
        <span className="badge badge-info">📊 Secure Tally</span>
        <span className="badge badge-success">🔐 Admin-only Access</span>
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Recorded Votes</div>
          <div className="stat-value">{loading ? '...' : data.totalVotes}</div>
          <div className="stat-desc">Encrypted ballots in MongoDB</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Successfully Tallied</div>
          <div className="stat-value" style={{ color: '#34d399' }}>{loading ? '...' : (data.talliedVotes ?? data.totalVotes)}</div>
          <div className="stat-desc">AES-GCM decrypted (integrity verified)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tampered / Rejected</div>
          <div className="stat-value" style={{ color: data.rejectedVotes > 0 ? '#f87171' : '#34d399', fontSize: '1.85rem' }}>
            {loading ? '...' : (data.rejectedVotes ?? 0)}
          </div>
          <div className="stat-desc">Failed GCM auth tag verification</div>
        </div>
      </div>

      {/* Tally Results */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📊 Live Tally Results</h2>
          <Link to="/admin/tally" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Full Tally Report →</button>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>⏳ Decrypting votes...</div>
        ) : Object.keys(results).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No votes tallied yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Object.entries(results).map(([candidateId, count]) => {
              const pct = totalTallied > 0 ? Math.round((count / totalTallied) * 100) : 0;
              const name = candidateNames[candidateId] || candidateId;
              return (
                <div key={candidateId} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{name}</span>
                    <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '1.1rem' }}>
                      {count} votes ({pct}%)
                    </span>
                  </div>
                  <div style={{ background: '#1e293b', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #38bdf8, #60a5fa)',
                        borderRadius: '9999px',
                        transition: 'width 1s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="card" style={{ background: '#0e1626' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: '#94a3b8' }}>🔐 Security Architecture</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.83rem', lineHeight: '1.8' }}>
          <li>This endpoint is protected by JWT authentication + admin RBAC middleware</li>
          <li>All votes are decrypted on-the-fly using AES-256-GCM (Part 5: Rutuja)</li>
          <li>GCM authentication tags verify integrity before counting each ballot</li>
          <li>Tampered ballots fail GCM auth and are counted as "rejected" — not tallied</li>
          <li>Normal voters (role: voter) are blocked from accessing any /admin/* routes</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminDashboard;
