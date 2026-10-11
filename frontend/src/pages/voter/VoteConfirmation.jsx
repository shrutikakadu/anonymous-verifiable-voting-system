import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function VoteConfirmation() {
  const navigate = useNavigate();
  const [receiptHash, setReceiptHash] = useState('');
  const [voteId, setVoteId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hash = sessionStorage.getItem('lastReceiptHash');
    const id = sessionStorage.getItem('lastVoteId');
    if (!hash) {
      // No receipt in session — likely direct URL access
      navigate('/dashboard');
      return;
    }
    setReceiptHash(hash);
    setVoteId(id || '');
    // Clear from session after reading (one-time read)
    sessionStorage.removeItem('lastReceiptHash');
    sessionStorage.removeItem('lastVoteId');
  }, [navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!receiptHash) return null;

  return (
    <div className="container">
      {/* Success Hero */}
      <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #0d2520, #0f2010)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.85rem', fontWeight: '700', color: '#34d399' }}>
          Vote Cast Successfully!
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem' }}>
          Your anonymous ballot has been encrypted with AES-256-GCM and recorded in the database.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          <span className="badge badge-success">✓ Encrypted (AES-256-GCM)</span>
          <span className="badge badge-success">✓ Token Consumed</span>
          <span className="badge badge-success">✓ SHA-256 Receipt Generated</span>
        </div>
      </div>

      {/* Receipt Hash Card */}
      <div className="card">
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          📝 Your Ballot Receipt Hash
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1rem' }}>
          This SHA-256 cryptographic receipt proves your vote was recorded. Save it to verify your ballot inclusion on the public bulletin board at any time — it does NOT reveal your candidate choice.
        </p>

        <div style={{ background: '#0f172a', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            SHA-256 Receipt Hash
          </div>
          <code className="mono" style={{ display: 'block', wordBreak: 'break-all', color: '#38bdf8', fontSize: '0.9rem', lineHeight: '1.6' }}>
            {receiptHash}
          </code>
          {voteId && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#475569' }}>
              Vote ID: {voteId}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy Receipt Hash'}
          </button>
          <Link
            to={`/verify-vote?receipt=${encodeURIComponent(receiptHash)}`}
            style={{ textDecoration: 'none' }}
          >
            <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Verify My Vote Now
            </button>
          </Link>
        </div>
      </div>

      {/* CNS Audit Info */}
      <div className="card" style={{ background: '#0e1626' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8' }}>
          🛡️ What This Receipt Proves
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.8' }}>
          <li><strong style={{ color: '#94a3b8' }}>Integrity:</strong> SHA-256 of (encryptedVote:IV:candidateId) — any tampering breaks the hash</li>
          <li><strong style={{ color: '#94a3b8' }}>Confidentiality:</strong> Your vote is stored as AES-256-GCM ciphertext — only admin can decrypt for tally</li>
          <li><strong style={{ color: '#94a3b8' }}>Anonymity:</strong> The receipt hash cannot be traced back to your voter identity</li>
          <li><strong style={{ color: '#94a3b8' }}>Verifiability:</strong> You can verify inclusion on the public bulletin board at any time</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ textDecoration: 'none', flex: 1 }}>
          <button className="btn-outline" style={{ width: '100%' }}>📋 View Public Bulletin Board</button>
        </Link>
        <Link to="/dashboard" style={{ textDecoration: 'none', minWidth: '150px' }}>
          <button className="btn-secondary" style={{ width: '100%' }}>← Dashboard</button>
        </Link>
      </div>
    </div>
  );
}

export default VoteConfirmation;
