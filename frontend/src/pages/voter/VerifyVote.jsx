import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { verifyReceipt, fetchVerificationStats } from '../../services/verificationService';

function VerifyVote() {
  const location = useLocation();
  const [receiptHash, setReceiptHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stats, setStats] = useState({ totalVotes: 0 });

  // Read query params if redirected from BulletinBoard (e.g. ?receipt=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const receiptParam = params.get('receipt');
    if (receiptParam) {
      setReceiptHash(receiptParam);
      runVerification(receiptParam);
    }

    // Load total recorded votes count
    fetchVerificationStats()
      .then((data) => setStats(data))
      .catch(() => {});
  }, [location.search]);

  const runVerification = async (hashToVerify) => {
    const target = (hashToVerify || receiptHash || '').trim();
    if (!target) {
      setErrorMsg('Please enter a receipt hash to verify.');
      setResult(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const response = await verifyReceipt(target);
      setResult(response);
    } catch (err) {
      // Axios error handling (404 or 400 from backend)
      if (err.response && err.response.data) {
        setResult(err.response.data);
      } else {
        setResult({
          valid: false,
          status: 'Not verified',
          message: 'Unable to connect to verification server. Please check backend connection.',
          receiptHash: target,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setReceiptHash(text.trim());
      }
    } catch {
      // Clipboard read permission might be denied
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recorded';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return String(timestamp);
    }
  };

  return (
    <div className="container">
      {/* Page Title & CNS Badges */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc' }}>
            Independent Vote Receipt Verification
          </h1>
          <span className="badge badge-info">Part 7: Shrutika</span>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          Cryptographic proof of inclusion. Enter your unique SHA-256 ballot receipt to independently audit that your anonymous vote was recorded in the official database.
        </p>
      </div>

      {/* CNS Concepts Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🔍 Public Verification</span>
        <span className="badge badge-info">🔒 Zero-Knowledge Integrity</span>
        <span className="badge badge-info">🛡️ SHA-256 Hash Matching</span>
        <span className="badge badge-success">✓ Double-Vote Protected</span>
      </div>

      {/* Stats Counter Bar */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#131b2e', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.9rem 1.25rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>📊</span>
        <div>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Recorded Votes in System: </span>
          <strong style={{ color: '#38bdf8', fontSize: '1.05rem', marginLeft: '0.35rem' }}>
            {stats.totalVotes ?? 0}
          </strong>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/" style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
            View Full Bulletin Board →
          </Link>
        </div>
      </div>

      {/* Verification Input Card */}
      <div className="card">
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          Verify Your Ballot Receipt
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            Enter SHA-256 Receipt Hash (64-character hexadecimal):
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={receiptHash}
              onChange={(e) => {
                setReceiptHash(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. 5a1b3c4d... (Paste your 64-char receipt hash)"
              style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePaste}
              title="Paste from clipboard"
            >
              📋 Paste
            </button>
            <button
              type="button"
              onClick={() => runVerification(receiptHash)}
              disabled={loading || !receiptHash.trim()}
              style={{ minWidth: '110px' }}
            >
              {loading ? 'Checking...' : '🔍 Verify'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Verification Result Display */}
        {result && (
          <div
            className={`verification-result ${
              result.valid ? 'result-valid' : result.code === 'INTEGRITY_FAILED' ? 'result-tampered' : 'result-invalid'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.8rem' }}>
                {result.valid ? '✅' : result.code === 'INTEGRITY_FAILED' ? '⚠️' : '❌'}
              </span>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.3rem',
                    color: result.valid ? '#34d399' : result.code === 'INTEGRITY_FAILED' ? '#fbbf24' : '#f87171',
                  }}
                >
                  {result.valid ? 'Vote Included' : result.status || 'Not Verified'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {result.message}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#94a3b8' }}>Receipt Hash:</span>
                <span className="mono" style={{ color: '#e2e8f0', wordBreak: 'break-all' }}>
                  {result.receiptHash || receiptHash}
                </span>
              </div>

              {result.valid && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#94a3b8' }}>Ledger Timestamp:</span>
                    <span style={{ color: '#e2e8f0' }}>{formatDate(result.timestamp)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: '#94a3b8' }}>Cryptographic Proof:</span>
                    <span style={{ color: '#34d399' }}>SHA-256 Match Confirmed in MongoDB Ballot Ledger</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.5rem' }}>
                    <span style={{ color: '#94a3b8' }}>Anonymity Status:</span>
                    <span style={{ color: '#60a5fa' }}>Secured (Voter Identity Decoupled)</span>
                  </div>
                </>
              )}

              {!result.valid && (
                <div style={{ color: '#f87171', marginTop: '0.5rem' }}>
                  {result.code === 'RECEIPT_NOT_FOUND' &&
                    'This receipt hash was not found in the election database. Either the vote was not yet submitted, or the receipt hash is incorrect.'}
                  {result.code === 'INVALID_FORMAT' &&
                    'Receipt hash format is invalid. A valid SHA-256 hash must be 64 hexadecimal characters.'}
                  {result.code === 'INTEGRITY_FAILED' &&
                    'Critical Alert: Hash integrity check failed. The record in the database may have been modified or tampered with.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audit Guide */}
      <div className="card" style={{ background: '#0e1626' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#94a3b8' }}>
          🛡️ CNS Audit Principles
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <li>
            <strong>Individual Verifiability:</strong> Every voter can independently confirm their ballot was counted by verifying their receipt hash on the public bulletin board.
          </li>
          <li>
            <strong>Ballot Secrecy:</strong> The receipt hash is computed over the ciphertext and IV (<code>SHA-256(encryptedVote:IV:candidateId)</code>), meaning neither public observers nor election workers can link your identity to your vote.
          </li>
          <li>
            <strong>Tamper Evidence:</strong> If any party attempts to modify the ballot box or receipt hash, the cryptographic checksum fails immediately.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default VerifyVote;
