export default function StatsCard({ label, value, hint }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <p className="text-secondary" style={{ marginBottom: '0.4rem' }}>
        {label}
      </p>
      <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{value}</h3>
      {hint ? (
        <p className="text-sm text-primary" style={{ marginTop: '0.35rem' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
