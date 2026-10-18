import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { registerVoter, resendRegistrationOTP } from '../../services/authService';
import ErrorMessage from '../../components/ErrorMessage';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resuming, setResuming] = useState(searchParams.get('resume') === '1');
  const [form, setForm] = useState({ name: '', voterId: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = resuming
        ? await resendRegistrationOTP({ voterId: form.voterId, password: form.password })
        : await registerVoter(form);
      sessionStorage.setItem('pendingOtp', JSON.stringify({
        voterId: resuming ? form.voterId.trim().toUpperCase() : result.voter.voterId,
        purpose: 'registration',
      }));
      setForm((prev) => ({ ...prev, password: '' }));
      navigate('/verify-otp', { state: {
        otpError: !resuming && !result.otpSent,
        otpMessage: !resuming && !result.otpSent ? result.message : '',
      } });
    } catch (err) {
      setError(err.response?.data?.message || (resuming ? 'Could not resume verification' : 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>{resuming ? 'Resume registration verification' : 'Register'}</h2>
        {resuming && <p>Use your original voter ID and password to request a new registration code. If your email is already verified, log in.</p>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {!resuming && <input name="name" placeholder="Name" autoComplete="name" required maxLength={100} value={form.name} onChange={handleChange} />}
          <input name="voterId" placeholder="Voter ID" autoComplete="username" required minLength={3} maxLength={64} value={form.voterId} onChange={handleChange} />
          {!resuming && <input name="email" type="email" placeholder="Email" autoComplete="email" required value={form.email} onChange={handleChange} />}
          <input name="password" type="password" placeholder={resuming ? 'Original password' : 'Password (at least 8 characters)'} autoComplete={resuming ? 'current-password' : 'new-password'} required minLength={resuming ? undefined : 8} value={form.password} onChange={handleChange} />
          <button type="submit" disabled={submitting}>{submitting ? (resuming ? 'Requesting…' : 'Registering…') : (resuming ? 'Resend registration OTP' : 'Register')}</button>
        </form>
        <ErrorMessage message={error} />
        <p>Already registered? <Link to="/login">Log in</Link>, or resume verification if you have not verified your email.</p>
        <button type="button" disabled={submitting} onClick={() => {
          setResuming((prev) => !prev);
          setError('');
          setForm((prev) => ({ ...prev, password: '' }));
        }}>{resuming ? 'Back to new registration' : 'Resume registration verification'}</button>
      </div>
    </div>
  );
}

export default Register;
