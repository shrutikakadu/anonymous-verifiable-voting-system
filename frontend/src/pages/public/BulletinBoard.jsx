import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBulletinBoard } from '../../services/verificationService';

function BulletinBoard() {
  const [votes, setVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);
  const navigate = useNavigate();

  const loadData = useCallback(async (search = '') => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBulletinBoard({ search });
      setVotes(data.votes || []);
      setTotalVotes(typeof data.totalVotes === 'number' ? data.totalVotes : (data.votes || []).length);
    } catch (err) {
      console.error('Failed to load bulletin board:', err);
      setError('Unable to connect to the public bulletin board. Ensure the backend server is running.');
      setVotes([]);
      setTotalVotes(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(searchTerm);
  }, [loadData, searchTerm]);

  const handleCopy = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyNavigate = (receiptHash) => {
    navigate(`/verify-vote?receipt=${encodeURIComponent(receiptHash)}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const d = new Date(timestamp);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(timestamp);
    }
  };

  return (
    <div className="container">
      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc' }}>
              Public Cryptographic Bulletin Board
            </h1>
            <span className="badge badge-info">Part 7: Shrutika</span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '680px' }}>
            Transparent, append-only public ledger of anonymous vote receipt hashes. Voters can independently verify that their ballot was recorded without exposing their choice or identity.
          </p>
        </div>
        <button
          onClick={() => loadData(searchTerm)}
          disabled={loading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
        >
          🔄 {loading ? 'Refreshing...' : 'Refresh Board'}
        </button>
      </div>

      {/* CNS Concepts Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🛡️ CNS Concept: Integrity (SHA-256)</span>
        <span className="badge badge-info">🌐 CNS Concept: Transparency</span>
        <span className="badge badge-info">🔍 CNS Concept: Public Verification</span>
        <span className="badge badge-info">📊 CNS Concept: Auditability</span>
        <span className="badge badge-success">🔒 Zero Identity Exposure</span>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Recorded Votes</div>
          <div className="stat-value">{totalVotes}</div>
          <div className="stat-desc">Cryptographically registered ballots</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Ledger Integrity</div>
          <div className="stat-value" style={{ color: '#34d399', fontSize: '1.5rem' }}>
            100% Verified
          </div>
          <div className="stat-desc">All entries signed & SHA-256 hashed</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Public Verifiability</div>
          <div className="stat-value" style={{ color: '#60a5fa', fontSize: '1.5rem' }}>
            End-to-End
          </div>
          <div className="stat-desc">Inspectable by voters, observers & auditors</div>
        </div>
      </div>

      {/* Search & Actions Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search by receipt hash (prefix or full SHA-256)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
            {searchTerm && (
              <button
                className="btn-secondary"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => navigate('/verify-vote')}
            className="btn-outline"
            style={{ whiteSpace: 'nowrap' }}
          >
            🔍 Verify My Receipt
          </button>
        </div>
      </div>

      {/* Bulletin Board Ledger Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>
            Ballot Receipt Ledger
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing {votes.length} of {totalVotes} recorded ballots
          </span>
        </div>

        {error && (
          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading cryptographic bulletin board...
          </div>
        ) : votes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '0.25rem' }}>
              {searchTerm ? 'No matching receipt found' : 'No votes recorded yet'}
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
              {searchTerm
                ? 'Check your receipt hash or clear the filter.'
                : 'Cast a vote in the system to see its anonymous receipt published on this public ledger.'}
            </p>
          </div>
        ) : (
          <div className="bb-table-wrapper">
            <table className="bb-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Anonymous Receipt Hash (SHA-256)</th>
                  <th style={{ width: '180px' }}>Recorded At</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((vote, index) => {
                  const hash = vote.receiptHash || '';
                  const shortHash = hash.length > 20
                    ? `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`
                    : hash;

                  return (
                    <tr key={vote._id || hash || index}>
                      <td style={{ color: '#64748b' }}>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            className="mono"
                            title={hash}
                            style={{ color: '#38bdf8', fontSize: '0.88rem' }}
                          >
                            {shortHash}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(hash)}
                            className="btn-secondary"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                            }}
                            title="Copy full hash to clipboard"
                          >
                            {copiedHash === hash ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        {formatDate(vote.timestamp)}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          ✓ Vote included
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleVerifyNavigate(hash)}
                          className="btn-outline"
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                          }}
                        >
                          Verify ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Educational Footer */}
      <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid #1e293b', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
        <strong style={{ color: '#94a3b8' }}>How Public Verifiability Works:</strong>
        <br />
        Every time an authenticated voter casts an anonymous ballot, the server generates a unique SHA-256 cryptographic receipt hash from the encrypted vote payload. This receipt is given to the voter and published on this public bulletin board. The voter can inspect this ledger at any time to verify their ballot is present, while no observer can decipher who cast the ballot or which candidate was chosen.
      </div>
    </div>
  );
}

export default BulletinBoard;
