import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, role = 'voter' }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin' && userRole !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
