export default function PageHeader({ title, subtitle, action }) {
  return (
    <div
      className="page-header"
      style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
    >
      <div>
        <h2
          className="page-title"
          style={{ fontSize: '20px', marginBottom: '0.25rem' }}
        >
          {title}
        </h2>
        {subtitle ? <p className="text-secondary">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
