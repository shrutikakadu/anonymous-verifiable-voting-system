import { useState } from 'react';
import { generateVotingToken } from '../../services/tokenService';

function GetVotingToken() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      const result = await generateVotingToken();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Token generation failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Anonymous Voting Token</h2>
        <button onClick={handleGenerate}>Generate Token</button>
        {data && (
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Token:</strong> {data.token}</p>
            <p><strong>Signature:</strong> {data.signature}</p>
          </div>
        )}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </div>
    </div>
  );
}

export default GetVotingToken;
