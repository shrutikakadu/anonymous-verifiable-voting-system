import { useState } from 'react';
import { verifyReceipt } from '../../services/verificationService';

function VerifyVote() {
  const [receiptHash, setReceiptHash] = useState('');
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    try {
      const response = await verifyReceipt(receiptHash);
      setResult(response);
    } catch (error) {
      setResult({ valid: false, message: 'Invalid receipt hash' });
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Verify Vote</h2>
        <input value={receiptHash} onChange={(e) => setReceiptHash(e.target.value)} placeholder="Receipt hash" style={{ width: '100%', marginBottom: '1rem' }} />
        <button onClick={handleVerify}>Verify</button>
        {result && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Result:</strong> {result.valid ? 'Valid' : 'Invalid'}
            {result.message && <div>{result.message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyVote;
