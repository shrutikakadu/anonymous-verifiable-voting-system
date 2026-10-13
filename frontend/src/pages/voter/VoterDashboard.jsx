import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVoterProfile } from '../../services/voterService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import useCountdown, { formatDuration } from '../../hooks/useCountdown';
import { buildSteps } from '../../utils/progress';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Stepper from '../../components/ui/Stepper';
import CopyField from '../../components/ui/CopyField';
import Skeleton from '../../components/ui/Skeleton';
import Icon from '../../components/ui/Icon';

const SESSION_WARNING_MS = 5 * 60 * 1000;

function VoterDashboard() {
  const navigate = useNavigate();
  const { votingCredential, receipt, logout, expiresAt } = useAuth();
  const remaining = useCountdown(expiresAt);
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

  const hasVoted = Boolean(profile && profile.hasVoted);
  const tokenReady = Boolean(votingCredential);
  const tokenIssued = tokenReady || Boolean(profile && profile.hasReceivedToken);

  let tokenValue = 'Not issued';
  let tokenNote = 'Request one to start voting';
  if (hasVoted) {
    tokenValue = 'Used';
    tokenNote = 'Consumed by your vote';
  } else if (tokenReady) {
    tokenValue = 'Ready';
    tokenNote = 'Stored in this browser tab';
  } else if (tokenIssued) {
    tokenValue = 'Issued';
    tokenNote = 'Not in this tab. Paste your saved copy.';
  }

  return (
    <div className="container">
      <PageHeader
        title="Voter Dashboard"
        subtitle={profile ? `Signed in as ${profile.name} (${profile.voterId})` : 'Your voting progress'}
      />

      {error && <Alert tone="danger" title="Could not load your profile">{error}</Alert>}
      {remaining > 0 && remaining < SESSION_WARNING_MS && (
        <Alert tone="warning" title="Your session ends soon">
          You will be signed out in {formatDuration(remaining)}. Finish voting, or log in again afterwards.
        </Alert>
      )}

      <Stepper steps={buildSteps({ tokenIssued, hasVoted })} />

      <div className="v-tiles">
        <div className="v-tile">
          <div className="v-tile-label"><Icon name="lock" /> Voting token</div>
          {loading ? <Skeleton width="60%" /> : <div className="v-tile-value">{tokenValue}</div>}
          <div className="v-tile-note">{loading ? '' : tokenNote}</div>
        </div>
        <div className="v-tile">
          <div className="v-tile-label"><Icon name="check" /> Ballot</div>
          {loading ? <Skeleton width="60%" /> : <div className="v-tile-value">{hasVoted ? 'Vote cast' : 'Not cast'}</div>}
          <div className="v-tile-note">{loading ? '' : 'One vote per voter'}</div>
        </div>
        <div className="v-tile">
          <div className="v-tile-label"><Icon name="clock" /> Session</div>
          <div className="v-tile-value">{formatDuration(remaining)}</div>
          <div className="v-tile-note">Then you are signed out automatically</div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <>
            <Skeleton width="40%" height="1.5rem" />
            <Skeleton />
            <Skeleton width="30%" height="2.4rem" />
          </>
        ) : hasVoted ? (
          <>
            <h2 style={{ marginTop: 0 }}>Your vote is recorded</h2>
            {receipt ? (
              <>
                <p className="v-muted">Copy your receipt hash now. You need it to verify your vote later.</p>
                <CopyField label="Receipt hash" value={receipt.receiptHash} />
                <div className="v-actions">
                  <button type="button" onClick={() => navigate(`/verify-vote?receipt=${encodeURIComponent(receipt.receiptHash)}`)}>Verify this receipt</button>
                </div>
              </>
            ) : (
              <>
                <p className="v-muted">Use the receipt hash you saved to check that your vote is on the bulletin board.</p>
                <div className="v-actions">
                  <button type="button" onClick={() => navigate('/verify-vote')}>Verify a receipt</button>
                </div>
              </>
            )}
          </>
        ) : tokenReady ? (
          <>
            <h2 style={{ marginTop: 0 }}>Your token is ready</h2>
            <p className="v-muted">Choose your candidate and submit your ballot.</p>
            <div className="v-actions">
              <button type="button" onClick={() => navigate('/vote')}>Go to the ballot</button>
            </div>
          </>
        ) : tokenIssued ? (
          <>
            <h2 style={{ marginTop: 0 }}>Token already issued</h2>
            <Alert tone="warning" title="This tab no longer has your token">
              A token can be issued only once. If you saved the token and signature, paste them on the ballot page.
            </Alert>
            <div className="v-actions">
              <button type="button" onClick={() => navigate('/vote')}>Go to the ballot</button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Get your anonymous voting token</h2>
            <p className="v-muted">The server signs a random token for you. Your ballot is stored without your name.</p>
            <div className="v-actions">
              <button type="button" onClick={() => navigate('/token')}>Get voting token</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>How your vote is protected</h3>
        <ul className="v-list">
          <li>Your login session is a signed JWT that expires after 2 hours and is revoked when you log out.</li>
          <li>Your voting token is random, signed by the server, and not linked to your voter record.</li>
          <li>Your ballot is encrypted with AES-256-GCM before it is stored.</li>
          <li>Your receipt hash lets you check that your ballot is on the public bulletin board.</li>
        </ul>
      </div>

      <div className="v-actions">
        <button type="button" className="btn-secondary" onClick={() => navigate('/verify-vote')}>Verify a receipt</button>
        <button type="button" className="btn-secondary" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default VoterDashboard;
