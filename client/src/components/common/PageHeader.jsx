export default function PageHeader({ title, subtitle, description, action, actionLabel, onAction, compact = false }) {
  const sub = subtitle || description;
  return (
    <div
      className="page-header card"
      style={{
        padding: compact ? '0.75rem 1.25rem' : '1.25rem 1.5rem',
        marginBottom: compact ? '0.75rem' : '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div>
        <h2
          className="page-title"
          style={{ fontSize: compact ? '17px' : '22px', fontWeight: 700, margin: 0 }}
        >
          {title}
        </h2>
        {sub ? <p className="text-secondary" style={{ margin: '0.2rem 0 0', fontSize: compact ? '0.8rem' : '0.9rem' }}>{sub}</p> : null}
      </div>
      {action ? (
        <div>{action}</div>
      ) : actionLabel && onAction ? (
        <button className="btn btn-primary" onClick={onAction} style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
