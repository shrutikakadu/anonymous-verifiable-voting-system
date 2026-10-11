import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuth } from '../../utils/tokenStorage';
import { fetchVerificationStats } from '../../services/verificationService';

function VoterDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalVotes: 0 });
  const voterId = localStorage.getItem('voterId') || 'Voter';
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchVerificationStats()
      .then((d) => setStats(d))
      .catch(() => {});
  }, [token, navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const steps = [
    {
      icon: '🔑',
      title: 'Get Anonymous Token',
      desc: 'Generate your one-time RSA-signed anonymous voting token.',
      link: '/token',
      badge: 'Step 1',
      color: '#60a5fa',
    },
    {
      icon: '🗳️',
      title: 'Cast Your Vote',
      desc: 'Select your candidate and submit with your token + signature.',
      link: '/vote',
      badge: 'Step 2',
      color: '#34d399',
    },
    {
      icon: '🔍',
      title: 'Verify Your Receipt',
      desc: 'Enter your SHA-256 receipt hash to verify ballot inclusion.',
      link: '/verify-vote',
      badge: 'Step 3',
      color: '#a78bfa',
    },
  ];

  return (
    <div className="container">
      {/* Welcome Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #131b2e, #1a2540)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>🛡️</span>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc' }}>
                  Voter Dashboard
                </h1>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Logged in as <span style={{ color: '#38bdf8', fontWeight: '600' }}>{voterId}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success">✓ Authenticated</span>
              <span className="badge badge-info">🔒 Session Active</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.1rem' }}>📊</span>
        <div>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Votes Recorded in System: </span>
          <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>{stats.totalVotes ?? 0}</strong>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/" style={{ color: '#60a5fa', fontSize: '0.85rem', textDecoration: 'none' }}>
            View Public Bulletin Board →
          </Link>
        </div>
      </div>

      {/* Voting Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {steps.map((step) => (
          <Link
            key={step.link}
            to={step.link}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                borderColor: 'transparent',
                margin: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = step.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>{step.icon}</span>
                <span className="badge badge-info">{step.badge}</span>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: step.color, fontSize: '1.1rem' }}>{step.title}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: '1.5' }}>{step.desc}</p>
              <div style={{ marginTop: '1rem', color: step.color, fontSize: '0.85rem', fontWeight: '600' }}>
                Go → {step.title}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CNS Info Box */}
      <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
        <strong style={{ color: '#94a3b8' }}>🔐 Your Privacy Guarantee:</strong>
        <br />
        Your anonymous voting token is RSA-signed and single-use (Part 3+4). Your vote is encrypted with AES-256-GCM before storage (Part 5). Your SHA-256 receipt lets you verify inclusion without revealing your identity (Part 7).
      </div>
    </div>
  );
}

export default VoterDashboard;
