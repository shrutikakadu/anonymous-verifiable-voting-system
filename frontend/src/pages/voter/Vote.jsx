import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { castVote } from '../../services/voteService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';

// No candidates endpoint exists yet. Keep these ids in sync with the tally (Member 7).
const CANDIDATES = [
  { id: 'c1', name: 'Candidate A', party: 'Party Alpha' },
  { id: 'c2', name: 'Candidate B', party: 'Party Beta' },
  { id: 'c3', name: 'Candidate C', party: 'Party Gamma' },
];

function Vote() {
  const navigate = useNavigate();
  const { votingCredential, clearVotingCredential, setReceipt } = useAuth();
  const [selected, setSelected] = useState('');
  const [manual, setManual] = useState({ token: '', signature: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use the token from this session; otherwise let the voter paste the one they saved.
  const token = (votingCredential ? votingCredential.token : manual.token).trim();
  const signature = (votingCredential ? votingCredential.signature : manual.signature).trim();
  const canSubmit = Boolean(selected && confirmed && token && signature && !loading);

  const handleVote = async () => {
    setError('');
    if (!canSubmit) return;

    setLoading(true);
    try {
      const result = await castVote({
        token,
        signature,
        candidateId: selected,
        votePayload: { candidateId: selected },
      });
      setReceipt(result.receiptHash);
      clearVotingCredential();
      navigate('/vote-confirmation', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Vote submission failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Cast your vote</h2>
        <p style={{ color: '#94a3b8' }}>Your ballot is encrypted before it is stored. You get a receipt hash to verify it later.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.25rem 0' }}>
          {CANDIDATES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected === c.id}
              onClick={() => { setSelected(c.id); setError(''); }}
              disabled={loading}
              style={{
                display: 'block',
                padding: '1.25rem',
                textAlign: 'center',
                background: selected === c.id ? 'rgba(56,189,248,0.12)' : '#0f172a',
                border: `2px solid ${selected === c.id ? '#38bdf8' : '#1e293b'}`,
                boxShadow: 'none',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{c.name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{c.party}</div>
            </button>
          ))}
        </div>

        {votingCredential ? (
          <div style={{ color: '#34d399', marginBottom: '1rem' }}>Voting token loaded from this session.</div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#fbbf24' }}>
              No token in this session. Paste the token and signature you saved
              (or <button type="button" className="btn-outline" onClick={() => navigate('/token')}>get your token</button>).
            </p>
            <label>Voting token (hex)</label>
            <input className="mono" value={manual.token} onChange={(e) => setManual((m) => ({ ...m, token: e.target.value }))} disabled={loading} />
            <label style={{ marginTop: '0.75rem' }}>RSA signature (base64)</label>
            <input className="mono" value={manual.signature} onChange={(e) => setManual((m) => ({ ...m, signature: e.target.value }))} disabled={loading} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
          <input
            type="checkbox"
            id="confirm-vote"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={loading}
            style={{ width: '18px', height: '18px', padding: 0 }}
          />
          <label htmlFor="confirm-vote" style={{ margin: 0 }}>I confirm this is my final vote. It cannot be changed.</label>
        </div>

        <ErrorMessage message={error} />

        <div style={{ marginTop: '1rem' }}>
          <button type="button" onClick={handleVote} disabled={!canSubmit}>{loading ? 'Submitting...' : 'Submit my vote'}</button>{' '}
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')} disabled={loading}>Dashboard</button>
        </div>
      </div>
    </div>
  );
}

export default Vote;
