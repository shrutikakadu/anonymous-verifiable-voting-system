import { useState } from 'react';

// The receipt, drawn as a paper slip. children are extra action buttons.
function ReceiptSlip({ receiptHash, children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="v-paper v-slip" aria-label="Vote receipt">
      <div className="v-slip-head">
        <div>
          <p className="v-eyebrow">Receipt</p>
          <h2>Your ballot is recorded</h2>
        </div>
        <span className="v-stamp">Recorded</span>
      </div>
      <div className="v-hash">{receiptHash}</div>
      <hr className="v-rule v-rule--dashed" />
      <p className="v-slip-note">Keep this number. It is the only way to check your vote on the bulletin board.</p>
      <div className="v-actions">
        <button type="button" className="v-btn-ink" onClick={handleCopy}>{copied ? 'Copied' : 'Copy receipt'}</button>
        {children}
      </div>
    </section>
  );
}

export default ReceiptSlip;
