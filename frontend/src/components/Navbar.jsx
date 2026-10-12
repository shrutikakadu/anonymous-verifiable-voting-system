import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearAuth } from '../utils/tokenStorage';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // Admin pages (Member 10) still use localStorage; the voter flow uses AuthContext.
  const isAdmin = Boolean(localStorage.getItem('token')) && localStorage.getItem('role') === 'admin';

  const navLinkStyle = (path) => {
    const active = location.pathname === path;
    return {
      color: active ? '#38bdf8' : '#cbd5e1',
      textDecoration: 'none',
      fontWeight: active ? '600' : '500',
      padding: '0.45rem 0.9rem',
      borderRadius: '8px',
      background: active ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
      border: active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
      transition: 'all 0.2s ease',
      fontSize: '0.88rem',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
    };
  };

  const handleAdminLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav
      style={{
        padding: '0.85rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 16, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#fff',
        flexWrap: 'wrap',
        gap: '0.85rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CryptoVote
          </span>
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', color: '#38bdf8', fontWeight: '600' }}>
            E2E Verifiable
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={navLinkStyle('/')}>Bulletin Board</Link>
        <Link to="/verify-vote" style={navLinkStyle('/verify-vote')}>Verify Vote</Link>

        {!isAuthenticated && !isAdmin && (
          <>
            <Link to="/register" style={navLinkStyle('/register')}>Register</Link>
            <Link to="/login" style={navLinkStyle('/login')}>Login</Link>
          </>
        )}

        {isAuthenticated && (
          <>
            <Link to="/dashboard" style={navLinkStyle('/dashboard')}>Dashboard</Link>
            <Link to="/token" style={navLinkStyle('/token')}>Token</Link>
            <Link to="/vote" style={navLinkStyle('/vote')}>Vote</Link>
          </>
        )}

        {isAdmin && !isAuthenticated && (
          <>
            <Link to="/admin/dashboard" style={navLinkStyle('/admin/dashboard')}>Admin</Link>
            <Link to="/admin/tally" style={navLinkStyle('/admin/tally')}>Tally</Link>
          </>
        )}

        {isAuthenticated && (
          <button type="button" onClick={logout} className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', borderRadius: '8px' }}>
            Logout
          </button>
        )}
        {isAdmin && !isAuthenticated && (
          <button type="button" onClick={handleAdminLogout} className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', borderRadius: '8px' }}>
            Logout
          </button>
        )}
        {!isAuthenticated && !isAdmin && (
          <Link to="/admin/login" style={{ ...navLinkStyle('/admin/login'), color: '#c084fc' }}>Admin</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
