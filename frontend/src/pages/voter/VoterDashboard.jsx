import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { logoutVoter } from '../../services/authService';
import { clearAuth } from '../../utils/tokenStorage';

function VoterDashboard() {
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logoutVoter();
      clearAuth();
      sessionStorage.removeItem('pendingOtp');
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.response?.data?.message || 'Could not revoke JWT. Please try again.');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Voter Dashboard</h2>
        <ul>
          <li><Link to="/token">Get Anonymous Voting Token</Link></li>
          <li><Link to="/vote">Cast Vote</Link></li>
          <li><Link to="/verify-vote">Verify Receipt</Link></li>
        </ul>
        <button type="button" onClick={handleLogout}>Logout</button>
        {logoutError && <p style={{ color: 'crimson' }}>{logoutError}</p>}
      </div>
    </div>
  );
}

export default VoterDashboard;
