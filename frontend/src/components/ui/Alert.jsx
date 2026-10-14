function Alert({ tone = 'info', title, children }) {
  if (!title && !children) return null;
  return (
    <div className={`v-alert v-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export default Alert;
