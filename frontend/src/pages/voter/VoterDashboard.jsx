import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVoterProfile } from '../../services/voterService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';

function VoterDashboard() {
  const navigate = useNavigate();
  const { votingCredential, receipt, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getVoterProfile()
      .then((data) => active && setProfile(data.voter))
      .catch((err) => active && setError(getErrorMessage(err, 'Could not load your profile')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="card"><Loading /></div>
      </div>
    );
  }

  const hasVoted = Boolean(profile && profile.hasVoted);
  const tokenIssued = Boolean(profile && profile.hasReceivedToken);
  const tokenInSession = Boolean(votingCredential);

  let tokenLabel = 'Not issued';
  if (tokenInSession) tokenLabel = 'Ready to use';
  else if (tokenIssued) tokenLabel = hasVoted ? 'Used' : 'Issued earlier';

  return (
    <div className="container">
      <div className="card">
        <h2>Voter Dashboard</h2>
        <ErrorMessage message={error} />
        {profile && <p>Signed in as <strong>{profile.name}</strong> ({profile.voterId})</p>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Voting token</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{tokenLabel}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ballot</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{hasVoted ? 'Vote cast' : 'Not cast'}</div>
          </div>
        </div>

        {!hasVoted && !tokenInSession && !tokenIssued && (
          <p><button type="button" onClick={() => navigate('/token')}>Get anonymous voting token</button></p>
        )}
        {!hasVoted && tokenInSession && (
          <p><button type="button" onClick={() => navigate('/vote')}>Go to the ballot</button></p>
        )}
        {!hasVoted && !tokenInSession && tokenIssued && (
          <div>
            <p style={{ color: '#fbbf24' }}>
              A token was already issued to your account and this browser tab no longer has it.
              A token can be issued only once. If you saved it, paste the token and signature on the vote page.
            </p>
            <button type="button" onClick={() => navigate('/vote')}>Go to the ballot</button>
          </div>
        )}

        {hasVoted && (
          <div>
            <p style={{ color: '#34d399' }}>Your vote is recorded.</p>
            {receipt ? (
              <>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Your receipt hash (copy it now):</div>
                <code className="mono" style={{ display: 'block', wordBreak: 'break-all' }}>{receipt.receiptHash}</code>
                <p><button type="button" className="btn-outline" onClick={() => navigate(`/verify-vote?receipt=${encodeURIComponent(receipt.receiptHash)}`)}>Verify this receipt</button></p>
              </>
            ) : (
              <p style={{ color: '#94a3b8' }}>Use the receipt hash you saved to check your vote on the verification page.</p>
            )}
          </div>
        )}

        <p style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/verify-vote')}>Verify a receipt</button>{' '}
          <button type="button" className="btn-secondary" onClick={logout}>Logout</button>
        </p>
      </div>
    </div>
  );
}

export default VoterDashboard;
