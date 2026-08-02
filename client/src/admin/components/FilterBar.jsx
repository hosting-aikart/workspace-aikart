export default function FilterBar({ children }) {
  return (
    <div
      className="card"
      style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}
