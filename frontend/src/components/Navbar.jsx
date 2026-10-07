import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();

  const navLinkStyle = (path) => ({
    color: location.pathname === path ? '#60a5fa' : '#e5e7eb',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? '600' : '400',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    background: location.pathname === path ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
    transition: 'all 0.2s ease',
  });

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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.5px', color: '#38bdf8' }}>
          🛡️ CryptoVote
        </span>
        <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: '#1e293b', borderRadius: '12px', color: '#94a3b8' }}>
          CNS Lab
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link to="/" style={navLinkStyle('/')}>📋 Bulletin Board</Link>
        <Link to="/verify-vote" style={navLinkStyle('/verify-vote')}>🔍 Verify Vote</Link>
        <Link to="/register" style={navLinkStyle('/register')}>Register</Link>
        <Link to="/login" style={navLinkStyle('/login')}>Login</Link>
        <Link to="/dashboard" style={navLinkStyle('/dashboard')}>Dashboard</Link>
        <Link to="/admin/login" style={navLinkStyle('/admin/login')}>Admin</Link>
      </div>
    </nav>
  );
}

export default Navbar;
