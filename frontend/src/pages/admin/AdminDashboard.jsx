import { useEffect, useState } from 'react';
import { fetchAdminDashboard } from '../../services/adminService';

function AdminDashboard() {
  const [data, setData] = useState({ totalVotes: 0, candidateResults: {} });

  useEffect(() => {
    fetchAdminDashboard().then((result) => setData(result)).catch(() => setData({ totalVotes: 0, candidateResults: {} }));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h2>Admin Dashboard</h2>
        <p>Total votes: {data.totalVotes}</p>
        <pre>{JSON.stringify(data.candidateResults, null, 2)}</pre>
      </div>
    </div>
  );
}

export default AdminDashboard;
