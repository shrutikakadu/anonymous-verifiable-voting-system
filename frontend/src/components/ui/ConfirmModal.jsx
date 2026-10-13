import { useEffect, useRef } from 'react';

function ConfirmModal({ open, title, children, confirmLabel = 'Confirm', busyLabel = 'Working...', cancelLabel = 'Cancel', busy = false, onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) cancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    if (confirmRef.current) confirmRef.current.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy]);

  if (!open) return null;

  return (
    <div
      className="v-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="v-modal" role="dialog" aria-modal="true" aria-labelledby="v-modal-title">
        <h2 id="v-modal-title">{title}</h2>
        <div className="v-muted">{children}</div>
        <div className="v-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" ref={confirmRef} onClick={onConfirm} disabled={busy}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
