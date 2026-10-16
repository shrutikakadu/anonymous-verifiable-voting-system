import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVoterProfile } from '../../services/voterService';
import { getErrorMessage } from '../../services/voterApi';
import { useAuth } from '../../context/AuthContext';
import useCountdown, { formatDuration } from '../../hooks/useCountdown';
import { buildSteps } from '../../utils/progress';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Checklist from '../../components/ui/Checklist';
import ReceiptSlip from '../../components/ui/ReceiptSlip';
import Skeleton from '../../components/ui/Skeleton';

const SESSION_WARNING_MS = 5 * 60 * 1000;

function VoterDashboard() {
  const navigate = useNavigate();
  const { votingCredential, receipt, expiresAt } = useAuth();
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
  const steps = buildSteps({ tokenIssued, hasVoted });

  let tokenValue = 'Not issued';
  let tokenNote = 'A random token signed by the server. It is not linked to your voter record.';
  if (hasVoted) {
    tokenValue = 'Used';
    tokenNote = 'Used when you voted.';
  } else if (tokenReady) {
    tokenValue = 'Ready';
    tokenNote = 'Stored in this browser tab.';
  } else if (tokenIssued) {
    tokenValue = 'Issued';
    tokenNote = 'Issued earlier, but this tab does not have it. Paste your saved copy on the ballot page.';
  }

  const receiptLink = receipt ? `/verify-vote?receipt=${encodeURIComponent(receipt.receiptHash)}` : '/verify-vote';

  const items = [
    {
      title: 'Signed in',
      status: 'done',
      note: remaining > 0 ? `Your session ends in ${formatDuration(remaining)}.` : '',
    },
    {
      title: 'Get your voting token',
      status: steps[1].status,
      note: tokenNote,
      action: !tokenIssued && !hasVoted ? <button type="button" onClick={() => navigate('/token')}>Get voting token</button> : null,
    },
    {
      title: 'Cast your vote',
      status: steps[2].status,
      note: hasVoted ? 'Your vote is recorded.' : 'Your ballot is encrypted before it is stored. One vote per voter.',
      action: !hasVoted && tokenIssued ? <button type="button" onClick={() => navigate('/vote')}>Open the ballot</button> : null,
    },
    {
      title: 'Keep your receipt',
      status: steps[3].status,
      note: hasVoted
        ? (receipt ? 'Copy it below. You need it to verify your vote.' : 'Use the receipt hash you saved.')
        : 'You get a receipt hash when you vote.',
    },
    {
      title: 'Verify your receipt',
      status: steps[4].status,
      note: 'Check that your ballot appears on the public bulletin board.',
      action: hasVoted ? <button type="button" onClick={() => navigate(receiptLink)}>Verify receipt</button> : null,
    },
  ];

  return (
    <div className="container">
      <PageHeader
        eyebrow="Voter"
        title="Your ballot"
        subtitle={profile ? `Signed in as ${profile.name} (${profile.voterId}).` : 'Your voting progress.'}
      />

      {error && <Alert tone="danger" title="Could not load your profile">{error}</Alert>}
      {remaining > 0 && remaining < SESSION_WARNING_MS && (
        <Alert tone="warning" title="Your session ends soon">
          You will be signed out in {formatDuration(remaining)}. Finish voting, or log in again afterwards.
        </Alert>
      )}

      <div className="v-split">
        <div className="v-stack">
          <div className="card">
            {loading ? (
              <>
                <Skeleton width="45%" height="1.3rem" />
                <Skeleton />
                <Skeleton width="70%" />
                <Skeleton width="55%" />
              </>
            ) : (
              <Checklist items={items} />
            )}
          </div>

          {hasVoted && receipt && (
            <ReceiptSlip receiptHash={receipt.receiptHash}>
              <button type="button" className="btn-secondary" onClick={() => navigate(receiptLink)}>Verify this receipt</button>
            </ReceiptSlip>
          )}
        </div>

        <div className="v-stack">
          <div className="card">
            <p className="v-eyebrow">Status</p>
            <dl className="v-dl">
              <div><dt>Voting token</dt><dd>{loading ? '...' : tokenValue}</dd></div>
              <div><dt>Ballot</dt><dd>{loading ? '...' : hasVoted ? 'Cast' : 'Not cast'}</dd></div>
              <div><dt>Session</dt><dd>{formatDuration(remaining)}</dd></div>
            </dl>
          </div>
          <div className="card">
            <p className="v-eyebrow">Protection</p>
            <ul className="v-list">
              <li>Your session is a signed token that expires after 2 hours and is revoked when you log out.</li>
              <li>Your ballot is stored without your name and encrypted with AES-256-GCM.</li>
              <li>Your receipt lets you check your ballot without revealing who you are.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoterDashboard;
