export default function DataTable({
  columns,
  rows,
  emptyMessage = 'No data available.',
}) {
  if (!rows?.length) {
    return (
      <div className="card" style={{ padding: '1rem' }}>
        <p className="text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--color-bg)' }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: 'left',
                    padding: '0.85rem 1rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                {columns.map((column) => (
                  <td
                    key={`${row.id || rowIndex}-${column.key}`}
                    style={{ padding: '0.85rem 1rem' }}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
