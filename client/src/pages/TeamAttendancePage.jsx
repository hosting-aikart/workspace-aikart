import { useEffect, useState } from 'react';
import api from '../utils/api';
import PageHeader from '../admin/components/PageHeader';
import DataTable from '../admin/components/DataTable';
import Badge from '../admin/components/Badge';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Failed to load team attendance.';

export default function TeamAttendancePage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/manager/attendance');
        setLogs(data?.data || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'WORKING':
        return <Badge tone="success">Checked In</Badge>;
      case 'CHECKED_OUT':
        return <Badge tone="primary">Completed</Badge>;
      case 'ABSENT':
        return <Badge tone="danger">Absent</Badge>;
      default:
        return <Badge tone="secondary">{status || '—'}</Badge>;
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Team Member',
      render: (row) => (
        <div>
          <strong style={{ fontSize: '0.95rem' }}>{row.user?.name || '—'}</strong>
          <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
            {row.user?.position || row.user?.employeeId || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row) => row.user?.department?.name || '—',
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) =>
        row.date
          ? new Date(row.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
          : '—',
    },
    {
      key: 'checkIn',
      label: 'Check In',
      render: (row) =>
        row.checkIn
          ? new Date(row.checkIn).toLocaleTimeString(undefined, { timeStyle: 'short' })
          : '—',
    },
    {
      key: 'checkOut',
      label: 'Check Out',
      render: (row) =>
        row.checkOut
          ? new Date(row.checkOut).toLocaleTimeString(undefined, { timeStyle: 'short' })
          : '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      log.user?.name?.toLowerCase().includes(term) ||
      log.user?.department?.name?.toLowerCase().includes(term) ||
      log.user?.position?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Team Attendance"
        subtitle="View work time logs, check-ins, and check-outs for your team members."
      />

      {error && (
        <div
          className="card"
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderColor: 'var(--color-danger)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <input
          className="input"
          placeholder="Search team member or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '360px' }}
        />
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading team attendance logs…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredLogs}
          emptyMessage="No attendance logs found for your team."
        />
      )}
    </div>
  );
}
