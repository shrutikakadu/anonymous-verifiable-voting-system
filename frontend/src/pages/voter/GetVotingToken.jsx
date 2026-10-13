import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVotingToken } from '../../services/tokenService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import { buildSteps } from '../../utils/progress';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Stepper from '../../components/ui/Stepper';
import CopyField from '../../components/ui/CopyField';
import Spinner from '../../components/ui/Spinner';
import Icon from '../../components/ui/Icon';

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
        message += '. If you saved the token and signature earlier, paste them on the ballot page.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const text = [
      'Voting token backup',
      'Keep this file private. Anyone who has it can use your token. Delete it after you vote.',
      '',
      `token=${votingCredential.token}`,
      `signature=${votingCredential.signature}`,
      '',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'voting-token-backup.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <PageHeader
        title="Anonymous voting token"
        subtitle="A random token signed by the server. It is not linked to your voter record."
      >
        <span className="badge badge-info">RSA signed</span>
        <span className="badge badge-success">One per voter</span>
      </PageHeader>

      <Stepper steps={buildSteps({ tokenIssued: Boolean(votingCredential), hasVoted: false })} />

      <div className="card">
        {!votingCredential ? (
          <>
            <p className="v-muted" style={{ marginTop: 0 }}>
              You can request your token once. After you get it, save a copy before you continue.
            </p>
            {error && <Alert tone="danger" title="Could not get a token">{error}</Alert>}
            <button type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? (<><Spinner /> Requesting token...</>) : 'Generate voting token'}
            </button>
          </>
        ) : (
          <>
            <Alert tone="warning" title="Save your token now">
              A new token cannot be issued to you. If you lose these values before you vote, you cannot vote.
            </Alert>
            <CopyField label="Voting token" value={votingCredential.token} secret />
            <CopyField label="RSA signature" value={votingCredential.signature} secret />
            <div className="v-actions">
              <button type="button" onClick={() => navigate('/vote')}>Continue to ballot</button>
              <button type="button" className="btn-secondary" onClick={handleDownload}><Icon name="download" /> Download backup</button>
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GetVotingToken;
