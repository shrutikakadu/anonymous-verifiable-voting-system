import { useEffect, useState } from 'react';
import { fetchBulletinBoard } from '../../services/verificationService';

function BulletinBoard() {
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    fetchBulletinBoard().then((data) => setVotes(data.votes || [])).catch(() => setVotes([]));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h2>Public Bulletin Board</h2>
        {votes.length === 0 ? (
          <p>No votes published yet.</p>
        ) : (
          <ul>
            {votes.map((vote, index) => (
              <li key={index}>
                {vote.receiptHash} — {vote.candidateId || 'unknown'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BulletinBoard;
