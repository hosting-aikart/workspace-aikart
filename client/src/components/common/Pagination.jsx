export default function Pagination({ page, totalPages, total, onPageChange }) {
  const start = total ? (page - 1) * 10 + 1 : 0;
  const end = Math.min(page * 10, total);

  return (
    <div className="card" style={{ padding: '0.9rem 1rem', marginTop: '1rem' }}>
      <div className="flex justify-between items-center">
        <span className="text-secondary">
          {total ? `Showing ${start}-${end} of ${total} records` : 'No records'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <button
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
