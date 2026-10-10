import { useState } from 'react';
import { verifyOTP } from '../../services/authService';
import ErrorMessage from '../../components/ErrorMessage';

function OTPVerification() {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const voterId = localStorage.getItem('voterId');
      if (!voterId) {
        setError('Please log in again before verifying your OTP.');
        return;
      }
      const result = await verifyOTP({ voterId, otpCode });
      setMessage(result.message);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>OTP Verification</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <input placeholder="OTP code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
          <button type="submit">Verify OTP</button>
        </form>
        {message && <div style={{ marginTop: '1rem', color: 'green' }}>{message}</div>}
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}

export default OTPVerification;
