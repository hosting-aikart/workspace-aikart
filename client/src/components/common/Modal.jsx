export default function Modal({ open, title, children, footer }) {
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
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{ 
          width: '100%', 
          maxWidth: '720px', 
          padding: '1.25rem',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexShrink: 0
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
        <div style={{ overflowY: 'auto', paddingRight: '0.25rem', flex: 1 }}>{children}</div>
        {footer ? (
          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
