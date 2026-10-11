import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth } from '../utils/tokenStorage';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isLoggedIn = !!token;
  const isAdmin = role === 'admin';

  const navLinkStyle = (path) => ({
    color: location.pathname === path ? '#60a5fa' : '#e5e7eb',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? '600' : '400',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    background: location.pathname === path ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
    fontSize: '0.9rem',
  });

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav
      style={{
        padding: '0.9rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        color: '#fff',
        flexWrap: 'wrap',
        gap: '0.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.5px', color: '#38bdf8' }}>
            🛡️ CryptoVote
          </span>
          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', background: '#1e293b', borderRadius: '12px', color: '#94a3b8' }}>
            CNS Lab
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={navLinkStyle('/')}>📋 Bulletin Board</Link>
        <Link to="/verify-vote" style={navLinkStyle('/verify-vote')}>🔍 Verify Vote</Link>

        {!isLoggedIn && (
          <>
            <Link to="/register" style={navLinkStyle('/register')}>Register</Link>
            <Link to="/login" style={navLinkStyle('/login')}>Login</Link>
          </>
        )}

        {isLoggedIn && !isAdmin && (
          <>
            <Link to="/dashboard" style={navLinkStyle('/dashboard')}>📊 Dashboard</Link>
            <Link to="/token" style={navLinkStyle('/token')}>🔑 Token</Link>
            <Link to="/vote" style={navLinkStyle('/vote')}>🗳️ Vote</Link>
          </>
        )}

        {isLoggedIn && isAdmin && (
          <>
            <Link to="/admin/dashboard" style={navLinkStyle('/admin/dashboard')}>👑 Admin</Link>
            <Link to="/admin/tally" style={navLinkStyle('/admin/tally')}>📊 Tally</Link>
          </>
        )}

        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px' }}
          >
            🚪 Logout
          </button>
        ) : (
          <Link to="/admin/login" style={{ ...navLinkStyle('/admin/login'), color: '#a78bfa' }}>
            👑 Admin
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
