import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTallyResults } from '../../services/adminService';

function TallyResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTallyResults()
      .then((result) => setData(result))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load tally. Ensure admin is logged in.'))
      .finally(() => setLoading(false));
  }, []);

  const candidateNames = { c1: 'Candidate A', c2: 'Candidate B', c3: 'Candidate C' };
  const results = data?.candidateResults || {};
  const totalTallied = data?.talliedVotes ?? data?.totalVotes ?? 0;
  const winner = totalTallied > 0
    ? Object.entries(results).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0])
    : null;

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc' }}>
            Secure Tally Results
          </h1>
          <span className="badge badge-info">Part 8: Dakkshesh</span>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          All votes retrieved from MongoDB, decrypted using AES-256-GCM (integrity verified via authentication tag), and tallied. Only authorized admin can run this operation.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🔓 AES-256-GCM Decryption</span>
        <span className="badge badge-info">🛡️ Integrity Verified</span>
        <span className="badge badge-info">👑 Admin Only</span>
        <span className="badge badge-success">🔒 RBAC Protected</span>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Votes</div>
          <div className="stat-value">{loading ? '...' : (data?.totalVotes ?? 0)}</div>
          <div className="stat-desc">Encrypted in MongoDB</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tallied</div>
          <div className="stat-value" style={{ color: '#34d399' }}>{loading ? '...' : totalTallied}</div>
          <div className="stat-desc">AES-GCM auth verified</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: (data?.rejectedVotes ?? 0) > 0 ? '#f87171' : '#34d399', fontSize: '1.85rem' }}>
            {loading ? '...' : (data?.rejectedVotes ?? 0)}
          </div>
          <div className="stat-desc">Tampered (GCM tag fail)</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Winner Banner */}
      {winner && winner[0] && (
        <div style={{ padding: '1.25rem 1.5rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(96,165,250,0.1))', border: '1px solid rgba(56,189,248,0.3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🏆</span>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Winner (Leading)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#38bdf8' }}>
              {candidateNames[winner[0]] || winner[0]}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {winner[1]} votes ({totalTallied > 0 ? Math.round((winner[1] / totalTallied) * 100) : 0}%)
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="card">
        <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          📊 Candidate-wise Results
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>⏳ Decrypting and tallying votes via AES-256-GCM...</div>
        ) : Object.keys(results).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>No votes have been tallied yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(results)
              .sort((a, b) => b[1] - a[1])
              .map(([candidateId, count], i) => {
                const pct = totalTallied > 0 ? Math.round((count / totalTallied) * 100) : 0;
                const name = candidateNames[candidateId] || candidateId;
                const isWinner = i === 0;
                return (
                  <div key={candidateId} style={{ background: '#0f172a', border: `1px solid ${isWinner ? 'rgba(56,189,248,0.4)' : '#1e293b'}`, borderRadius: '10px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isWinner && <span>🏆</span>}
                        <span style={{ color: '#f1f5f9', fontWeight: '600', fontSize: '1.05rem' }}>{name}</span>
                        <span style={{ color: '#64748b', fontSize: '0.83rem' }}>({candidateId})</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '1.2rem' }}>{count}</span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.35rem' }}>votes ({pct}%)</span>
                      </div>
                    </div>
                    <div style={{ background: '#1e293b', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isWinner
                            ? 'linear-gradient(90deg, #38bdf8, #60a5fa)'
                            : 'linear-gradient(90deg, #334155, #475569)',
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

      {/* Decryption Audit */}
      <div className="card" style={{ background: '#0e1626' }}>
        <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '0.95rem', color: '#94a3b8' }}>🔐 Decryption Pipeline</h3>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.83rem', lineHeight: '1.8' }}>
          <li>Admin authenticates (JWT + RBAC middleware)</li>
          <li>All Vote records fetched from MongoDB (encryptedVote, iv, authTag, candidateId)</li>
          <li>Each vote decrypted via <code style={{ color: '#a78bfa' }}>decryptAES(record, AES_SECRET_KEY)</code> (AES-256-GCM)</li>
          <li>GCM authentication tag verified — tampered votes raise an error and are counted as rejected</li>
          <li>candidateId extracted from decrypted payload → tallied</li>
        </ol>
      </div>

      <Link to="/admin/dashboard" style={{ textDecoration: 'none' }}>
        <button className="btn-secondary">← Back to Admin Dashboard</button>
      </Link>
    </div>
  );
}

export default TallyResults;
