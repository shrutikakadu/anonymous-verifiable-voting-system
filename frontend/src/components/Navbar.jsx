import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearAuth } from '../utils/tokenStorage';
import ThemeToggle from './ThemeToggle';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Admin pages still use localStorage; the voter flow uses AuthContext.
  // Read it safely so blocked storage cannot crash the navbar.
  const readLocal = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const isAdmin = Boolean(readLocal('token')) && readLocal('role') === 'admin';

  const linkStyle = (path) => {
    const active = location.pathname === path;
    return {
      color: active ? 'var(--tx)' : 'var(--mu)',
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: active ? 600 : 500,
      padding: '0.3rem 0',
      borderBottom: active ? '2px solid var(--ac)' : '2px solid transparent',
    };
  };

  const smallButton = { padding: '0.35rem 0.8rem', fontSize: '0.82rem' };

  const handleAdminLogout = () => {
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
        flexWrap: 'wrap',
        gap: '0.75rem 1.5rem',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-main)', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 600 }}>
        CryptoVote
      </Link>

      <div style={{ display: 'flex', gap: '1.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={linkStyle('/')}>Bulletin board</Link>
        <Link to="/verify-vote" style={linkStyle('/verify-vote')}>Verify a vote</Link>

        {!isAuthenticated && !isAdmin && (
          <>
            <Link to="/register" style={linkStyle('/register')}>Register</Link>
            <Link to="/login" style={linkStyle('/login')}>Login</Link>
          </>
        )}

        {isAuthenticated && (
          <>
            <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
            <Link to="/token" style={linkStyle('/token')}>Token</Link>
            <Link to="/vote" style={linkStyle('/vote')}>Ballot</Link>
            <button type="button" className="btn-secondary" style={smallButton} onClick={logout}>Log out</button>
          </>
        )}

        {isAdmin && !isAuthenticated && (
          <>
            <Link to="/admin/dashboard" style={linkStyle('/admin/dashboard')}>Admin</Link>
            <Link to="/admin/tally" style={linkStyle('/admin/tally')}>Tally</Link>
            <button type="button" className="btn-secondary" style={smallButton} onClick={handleAdminLogout}>Log out</button>
          </>
        )}

        {!isAuthenticated && !isAdmin && (
          <Link to="/admin/login" style={{ ...linkStyle('/admin/login'), color: 'var(--dim)' }}>Admin</Link>
        )}

        <ThemeToggle />
      </div>
    </nav>
  );
}

export default Navbar;
