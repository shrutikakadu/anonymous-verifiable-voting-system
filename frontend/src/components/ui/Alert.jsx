import Icon from './Icon';

const ICONS = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' };

function Alert({ tone = 'info', title, children }) {
  if (!title && !children) return null;
  return (
    <div className={`v-alert v-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ICONS[tone]} />
      <div>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export default Alert;
