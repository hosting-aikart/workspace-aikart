import { useState } from 'react';

/**
 * ConfirmDialog
 * Shared "are you sure?" dialog for every destructive action in the app
 * (delete chat, leave group, clear chat, delete task/department/project/
 * announcement, ...). Manages its own loading state around `onConfirm` so
 * every one of those call sites gets a spinner + disabled buttons for free
 * instead of the button just sitting there looking unresponsive while the
 * request is in flight.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  onCancel,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      // If onConfirm closed the dialog on success, `open` is already false
      // by the time this runs and the component won't render — harmless.
      // If it threw, this resets the button so the dialog stays usable.
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '420px', padding: '1.25rem' }}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p className="text-secondary">{description}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1rem',
          }}
        >
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
            style={{ minWidth: '92px' }}
          >
            {loading ? <span className="spinner spinner-sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
