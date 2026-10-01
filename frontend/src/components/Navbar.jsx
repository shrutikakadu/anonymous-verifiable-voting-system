import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ padding: '1rem 2rem', display: 'flex', gap: '1rem', background: '#111827', color: '#fff' }}>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Bulletin Board</Link>
      <Link to="/register" style={{ color: '#fff', textDecoration: 'none' }}>Register</Link>
      <Link to="/login" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
      <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>Dashboard</Link>
      <Link to="/admin/login" style={{ color: '#fff', textDecoration: 'none' }}>Admin</Link>
    </nav>
  );
}

export default Navbar;
