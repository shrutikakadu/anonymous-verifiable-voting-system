import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function VoteConfirmation() {
  const { receipt } = useAuth();
  const [copied, setCopied] = useState(false);

  // Direct URL access without a fresh vote goes back to the dashboard.
  if (!receipt) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.receiptHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
        <h2 style={{ color: '#34d399' }}>Vote cast successfully</h2>
        <p style={{ color: '#94a3b8' }}>
          Your ballot was encrypted and recorded. Save this receipt hash: you need it to verify your vote later.
        </p>
        <code className="mono" style={{ display: 'block', wordBreak: 'break-all', padding: '1rem', color: '#38bdf8' }}>
          {receipt.receiptHash}
        </code>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={handleCopy}>{copied ? 'Copied' : 'Copy receipt hash'}</button>
          <Link to={`/verify-vote?receipt=${encodeURIComponent(receipt.receiptHash)}`}><button type="button">Verify my vote now</button></Link>
          <Link to="/"><button type="button" className="btn-outline">Bulletin board</button></Link>
          <Link to="/dashboard"><button type="button" className="btn-secondary">Dashboard</button></Link>
        </div>
      </div>
    </div>
  );
}

export default VoteConfirmation;
