export default function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

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
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
