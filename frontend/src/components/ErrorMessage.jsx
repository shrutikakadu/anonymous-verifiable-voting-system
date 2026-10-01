function ErrorMessage({ message }) {
  if (!message) return null;
  return <div style={{ color: 'crimson', marginTop: '0.5rem' }}>{message}</div>;
}

export default ErrorMessage;
