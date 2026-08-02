export default function EmptyState({ title, description }) {
  return (
    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
      <h3 style={{ marginBottom: '0.35rem' }}>{title}</h3>
      <p className="text-secondary">{description}</p>
    </div>
  );
}
