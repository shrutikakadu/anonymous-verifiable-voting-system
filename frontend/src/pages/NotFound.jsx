import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="container">
      <div className="card">
        <h2>Page not found</h2>
        <p className="v-muted">That address does not exist.</p>
        <button type="button" onClick={() => navigate('/')}>Back to home</button>
      </div>
    </div>
  );
}

export default NotFound;
