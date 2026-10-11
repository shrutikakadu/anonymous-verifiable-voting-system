import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { castVote } from '../../services/voteService';

const CANDIDATES = [
  { id: 'c1', name: 'Candidate A', party: 'Party Alpha', emoji: '🔵' },
  { id: 'c2', name: 'Candidate B', party: 'Party Beta',  emoji: '🔴' },
  { id: 'c3', name: 'Candidate C', party: 'Party Gamma', emoji: '🟢' },
];

function Vote() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  const [token, setToken] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Pre-fill from sessionStorage (set by GetVotingToken page)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('votingToken');
    const savedSig = sessionStorage.getItem('votingSignature');
    if (savedToken) setToken(savedToken);
    if (savedSig) setSignature(savedSig);
  }, []);

  const handleVote = async () => {
    if (!selected) { setError('Please select a candidate.'); return; }
    if (!token.trim()) { setError('Voting token is required. Please get your token first.'); return; }
    if (!signature.trim()) { setError('RSA signature is required. Please get your token first.'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await castVote({
        token: token.trim(),
        signature: signature.trim(),
        candidateId: selected,
        votePayload: { candidateId: selected },
      });

      // Store receipt for confirmation page
      sessionStorage.setItem('lastReceiptHash', result.receiptHash);
      sessionStorage.setItem('lastVoteId', result.voteId);
      sessionStorage.removeItem('votingToken');
      sessionStorage.removeItem('votingSignature');

      navigate('/vote-confirmation');
    } catch (err) {
      setError(err.response?.data?.message || 'Vote submission failed. Please try again.');
      setLoading(false);
    }
  };

  const selectedCandidate = CANDIDATES.find((c) => c.id === selected);

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc' }}>
            Cast Your Vote
          </h1>
          <span className="badge badge-info">Part 6: Vote Submission</span>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          Select your candidate and submit with your anonymous RSA token. Your vote will be AES-256-GCM encrypted before storage. You will receive a SHA-256 receipt hash for verification.
        </p>
      </div>

      {/* CNS Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🛡️ RSA Token Verification</span>
        <span className="badge badge-info">🔒 AES-256-GCM Encryption</span>
        <span className="badge badge-info">📝 SHA-256 Receipt</span>
        <span className="badge badge-success">🚫 Replay Attack Prevention</span>
      </div>

      {/* Candidate Selection */}
      <div className="card">
        <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          🗳️ Select Your Candidate
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {CANDIDATES.map((c) => (
            <div
              key={c.id}
              onClick={() => { setSelected(c.id); setError(''); }}
              style={{
                padding: '1.25rem',
                borderRadius: '10px',
                border: `2px solid ${selected === c.id ? '#38bdf8' : '#1e293b'}`,
                background: selected === c.id ? 'rgba(56,189,248,0.1)' : '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{c.emoji}</div>
              <div style={{ fontWeight: '700', color: selected === c.id ? '#38bdf8' : '#f1f5f9', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{c.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{c.party}</div>
              {selected === c.id && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span className="badge badge-success">✓ Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Token Input */}
      <div className="card">
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          🔑 Voting Token &amp; Signature
        </h2>
        {token && (
          <div style={{ padding: '0.6rem 1rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            ✅ Token auto-loaded from your session
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Voting Token (Hex)
          </label>
          <input
            className="mono"
            placeholder="Paste your 64-character anonymous voting token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            RSA Signature (Base64)
          </label>
          <input
            className="mono"
            placeholder="Paste the RSA signature received with your token..."
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Confirm + Submit */}
      <div className="card">
        {selectedCandidate && (
          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>{selectedCandidate.emoji}</span>
            <div>
              <div style={{ fontWeight: '600', color: '#f1f5f9' }}>You are voting for: {selectedCandidate.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{selectedCandidate.party}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <input
            type="checkbox"
            id="confirm-vote"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer', padding: 0, accentColor: '#38bdf8' }}
          />
          <label htmlFor="confirm-vote" style={{ color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer' }}>
            I confirm this is my final vote. I understand this action is irreversible.
          </label>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleVote}
            disabled={loading || !confirmed || !selected || !token.trim() || !signature.trim()}
            style={{ flex: 1, minWidth: '200px', padding: '0.85rem', fontSize: '1rem', fontWeight: '600' }}
          >
            {loading ? '⏳ Submitting...' : '🗳️ Submit My Vote'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigate('/token')}
            style={{ minWidth: '150px' }}
          >
            ← Get Token
          </button>
        </div>
      </div>
    </div>
  );
}

export default Vote;
