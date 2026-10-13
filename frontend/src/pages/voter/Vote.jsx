import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { castVote } from '../../services/voteService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import { buildSteps } from '../../utils/progress';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Stepper from '../../components/ui/Stepper';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Icon from '../../components/ui/Icon';

// No candidates endpoint exists yet. Keep these ids in sync with the tally.
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use the token from this session; otherwise let the voter paste the one they saved.
  const token = (votingCredential ? votingCredential.token : manual.token).trim();
  const signature = (votingCredential ? votingCredential.signature : manual.signature).trim();
  const hasToken = Boolean(token && signature);
  const selectedCandidate = CANDIDATES.find((c) => c.id === selected);

  const handleVote = async () => {
    if (!selected || !hasToken || loading) return;
    setError('');
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
      setConfirmOpen(false);
      setError(getErrorMessage(err, 'Vote submission failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <PageHeader title="Cast your vote" subtitle="Your ballot is encrypted before it is stored. You get a receipt hash to verify it later.">
        <span className="badge badge-info">AES-256-GCM</span>
        <span className="badge badge-info">SHA-256 receipt</span>
      </PageHeader>

      <Stepper steps={buildSteps({ tokenIssued: hasToken, hasVoted: false })} />

      {votingCredential ? (
        <Alert tone="success" title="Voting token loaded">The token from this session will be used for your ballot.</Alert>
      ) : (
        <div className="card">
          <Alert tone="warning" title="No token in this session">
            Paste the token and signature you saved, or get your token first.
          </Alert>
          <span className="v-label">Voting token (hex)</span>
          <input className="mono" value={manual.token} onChange={(e) => setManual((m) => ({ ...m, token: e.target.value }))} disabled={loading} autoComplete="off" />
          <span className="v-label" style={{ marginTop: '0.9rem' }}>RSA signature (base64)</span>
          <input className="mono" value={manual.signature} onChange={(e) => setManual((m) => ({ ...m, signature: e.target.value }))} disabled={loading} autoComplete="off" />
          <div className="v-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/token')}>Get my token</button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Select your candidate</h2>
        <div className="v-candidates">
          {CANDIDATES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="v-candidate"
              aria-pressed={selected === c.id}
              onClick={() => { setSelected(c.id); setError(''); }}
              disabled={loading}
            >
              {selected === c.id && <span className="v-candidate-check"><Icon name="check" /></span>}
              <span className="v-avatar">{c.name.slice(-1)}</span>
              <span className="v-candidate-name">{c.name}</span>
              <span className="v-candidate-party">{c.party}</span>
            </button>
          ))}
        </div>

        {error && <Alert tone="danger" title="Your vote was not submitted">{error}</Alert>}

        <div className="v-actions">
          <button type="button" onClick={() => setConfirmOpen(true)} disabled={!selected || !hasToken || loading}>
            Review and submit
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')} disabled={loading}>Dashboard</button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm your vote"
        confirmLabel="Cast my vote"
        busyLabel="Submitting..."
        busy={loading}
        onConfirm={handleVote}
        onCancel={() => setConfirmOpen(false)}
      >
        {selectedCandidate && (
          <p style={{ margin: 0 }}>
            You are voting for <strong style={{ color: '#f8fafc' }}>{selectedCandidate.name}</strong> ({selectedCandidate.party}).
            This cannot be changed.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
}

export default Vote;
