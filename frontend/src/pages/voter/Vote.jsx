import { useState } from 'react';
import { castVote } from '../../services/voteService';

const candidates = [
  { id: 'c1', name: 'Candidate A' },
  { id: 'c2', name: 'Candidate B' },
  { id: 'c3', name: 'Candidate C' },
];

function Vote() {
  const [selected, setSelected] = useState('c1');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const handleVote = async () => {
    try {
      const result = await castVote({
        token,
        candidateId: selected,
        votePayload: { candidateId: selected, vote: 'yes' },
      });
      setMessage(`Vote submitted. Receipt: ${result.receiptHash}`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Vote failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Vote</h2>
        <input placeholder="Voting token" value={token} onChange={(e) => setToken(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }} />
        {candidates.map((candidate) => (
          <button key={candidate.id} onClick={() => setSelected(candidate.id)} style={{ margin: '0.5rem' }}>
            {candidate.name}
          </button>
        ))}
        <div style={{ marginTop: '1rem' }}>
          <strong>Selected:</strong> {selected}
        </div>
        <button onClick={handleVote} style={{ marginTop: '1rem' }}>Cast Vote</button>
        {message && <div style={{ marginTop: '1rem', color: 'green' }}>{message}</div>}
      </div>
    </div>
  );
}

export default Vote;
