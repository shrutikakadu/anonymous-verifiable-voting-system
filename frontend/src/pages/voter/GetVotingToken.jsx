import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateVotingToken } from '../../services/tokenService';

function GetVotingToken() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const result = await generateVotingToken();
      setData(result);
      // Store token + signature for use in Vote page
      sessionStorage.setItem('votingToken', result.token);
      sessionStorage.setItem('votingSignature', result.signature);
    } catch (err) {
      setError(err.response?.data?.message || 'Token generation failed. Ensure you are logged in.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopy = (field, value) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: '700', color: '#f8fafc' }}>
            Anonymous Voting Token
          </h1>
          <span className="badge badge-info">🔑 RSA Blinded Token</span>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
          Generate your one-time RSA-signed anonymous voting token. The token is randomly generated, signed with the server's private key, and stored only as a hash — never linking back to your identity.
        </p>
      </div>

      {/* Cryptographic Security Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <span className="badge badge-info">🔑 RSA Private Key Signing</span>
        <span className="badge badge-info">🌐 Public Key Cryptography</span>
        <span className="badge badge-info">🛡️ Digital Signature</span>
        <span className="badge badge-success">🔒 Anonymity Preserved</span>
      </div>

      {/* Generate Card */}
      <div className="card">
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#f1f5f9' }}>
          🎫 Generate Your Token
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Each authenticated voter may generate exactly one anonymous voting token. The token is signed with RSA using the server's private key. Only tokens verifiable by the server's public key are accepted.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading || !!data}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? '⏳ Generating...' : data ? '✓ Token Generated' : '🔑 Generate Voting Token'}
        </button>

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {data && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              ✅ Token generated and signed successfully! Copy both values below before proceeding to vote.
            </div>

            {/* Token */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Anonymous Voting Token (Hex)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code className="mono" style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#38bdf8', wordBreak: 'break-all', lineHeight: '1.5' }}>
                  {data.token}
                </code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCopy('token', data.token)}
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {copied === 'token' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Signature */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                RSA Signature (Base64)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code className="mono" style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#a78bfa', wordBreak: 'break-all', lineHeight: '1.5' }}>
                  {data.signature}
                </code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCopy('signature', data.signature)}
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  {copied === 'signature' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/vote')} style={{ flex: 1, minWidth: '200px' }}>
                🗳️ Proceed to Vote →
              </button>
              <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ minWidth: '140px' }}>
                ← Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="card" style={{ background: '#0e1626' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8' }}>🔐 How RSA Token Works</h3>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.8' }}>
          <li>Server generates 32 random bytes → 64-char hex token</li>
          <li>Server signs the token using RSA-2048 private key (SHA-256 digest)</li>
          <li>Only the SHA-256 hash of the token is stored in MongoDB</li>
          <li>Raw token + signature returned to you — token itself never stored</li>
          <li>During voting, signature is verified with server's public key</li>
        </ol>
      </div>
    </div>
  );
}

export default GetVotingToken;
