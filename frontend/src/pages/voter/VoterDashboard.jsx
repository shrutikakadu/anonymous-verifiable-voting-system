import { Link } from 'react-router-dom';

function VoterDashboard() {
  return (
    <div className="container">
      <div className="card">
        <h2>Voter Dashboard</h2>
        <ul>
          <li><Link to="/token">Get Anonymous Voting Token</Link></li>
          <li><Link to="/vote">Cast Vote</Link></li>
          <li><Link to="/verify-vote">Verify Receipt</Link></li>
        </ul>
      </div>
    </div>
  );
}

export default VoterDashboard;
