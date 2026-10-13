import { useLocation } from 'react-router-dom';
import Alert from './ui/Alert';

// Shown above the login page after an automatic sign-out.
function SessionNotice() {
  const { pathname, state } = useLocation();
  if (pathname !== '/login' || !state || state.reason !== 'expired') return null;
  return (
    <div className="container" style={{ marginBottom: 0 }}>
      <Alert tone="warning" title="Session expired">Your session ended. Log in again to continue.</Alert>
    </div>
  );
}

export default SessionNotice;
