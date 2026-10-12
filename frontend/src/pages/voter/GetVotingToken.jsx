import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVotingToken } from '../../services/tokenService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';

function CopyField({ label, value, color }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <code className="mono" style={{ flex: 1, color, wordBreak: 'break-all' }}>{value}</code>
        <button type="button" className="btn-secondary" onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );
}

function GetVotingToken() {
  const navigate = useNavigate();
  const { votingCredential, setVotingCredential } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await generateVotingToken();
      setVotingCredential({ token: data.token, signature: data.signature });
    } catch (err) {
      let message = getErrorMessage(err, 'Token generation failed');
      if (err.response && err.response.status === 409) {
        message += '. If you saved the token and signature earlier, paste them on the vote page.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Anonymous Voting Token</h2>
        <p style={{ color: '#94a3b8' }}>
          The server signs a random token that is not linked to your identity.
          Only one token is issued per voter, so keep it safe until you vote.
        </p>

        <button type="button" onClick={handleGenerate} disabled={loading || Boolean(votingCredential)}>
          {loading ? 'Generating...' : votingCredential ? 'Token generated' : 'Generate voting token'}
        </button>
        <ErrorMessage message={error} />

        {votingCredential && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ color: '#34d399', marginBottom: '1rem' }}>
              Token issued. Copy both values somewhere safe: if you lose them, a new token cannot be issued.
            </div>
            <CopyField label="Voting token (hex)" value={votingCredential.token} color="#38bdf8" />
            <CopyField label="RSA signature (base64)" value={votingCredential.signature} color="#a78bfa" />
            <button type="button" onClick={() => navigate('/vote')}>Continue to ballot</button>{' '}
            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GetVotingToken;
