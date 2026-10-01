import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Register from './pages/voter/Register';
import Login from './pages/voter/Login';
import OTPVerification from './pages/voter/OTPVerification';
import VoterDashboard from './pages/voter/VoterDashboard';
import GetVotingToken from './pages/voter/GetVotingToken';
import Vote from './pages/voter/Vote';
import VoteConfirmation from './pages/voter/VoteConfirmation';
import VerifyVote from './pages/voter/VerifyVote';
import BulletinBoard from './pages/public/BulletinBoard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import TallyResults from './pages/admin/TallyResults';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<BulletinBoard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/dashboard" element={<ProtectedRoute><VoterDashboard /></ProtectedRoute>} />
        <Route path="/token" element={<ProtectedRoute><GetVotingToken /></ProtectedRoute>} />
        <Route path="/vote" element={<ProtectedRoute><Vote /></ProtectedRoute>} />
        <Route path="/vote-confirmation" element={<ProtectedRoute><VoteConfirmation /></ProtectedRoute>} />
        <Route path="/verify-vote" element={<VerifyVote />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/tally" element={<ProtectedRoute role="admin"><TallyResults /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;
