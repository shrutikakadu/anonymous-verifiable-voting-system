import { useState } from 'react';
import Icon from './Icon';

// secret=true hides the value until the user clicks Show (protects against shoulder surfing).
function CopyField({ label, value, secret = false }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!secret);

  const shown = revealed ? value : `${value.slice(0, 8)}${'*'.repeat(24)}`;

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
    <div className="v-copy">
      <span className="v-label">{label}</span>
      <div className="v-copy-row">
        <div className="v-copy-value">{shown}</div>
        {secret && (
          <button type="button" className="btn-secondary v-btn-sm" onClick={() => setRevealed((r) => !r)}>
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
        <button type="button" className="btn-secondary v-btn-sm" onClick={handleCopy}>
          <Icon name="copy" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default CopyField;
