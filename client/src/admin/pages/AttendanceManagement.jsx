import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    employee: '',
    department: '',
    status: '',
  });

  useEffect(() => {
    const loadAttendance = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/attendance', {
          params: {
            page,
            limit: 10,
            from: filters.from || undefined,
            to: filters.to || undefined,
            employee: filters.employee || undefined,
            department: filters.department || undefined,
            status: filters.status || undefined,
          },
        });
        const payload = data?.data || {};
        setAttendance(payload.attendance || []);
        setPagination(
          payload.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadAttendance();
  }, [
    filters.department,
    filters.employee,
    filters.from,
    filters.status,
    filters.to,
    page,
  ]);

  const rows = useMemo(
    () =>
      attendance.map((entry) => ({
        ...entry,
        employeeName: entry.user?.name || '—',
        departmentName: entry.user?.department?.name || '—',
        checkInLabel: entry.checkIn
          ? new Date(entry.checkIn).toLocaleTimeString()
          : '—',
        checkOutLabel: entry.checkOut
          ? new Date(entry.checkOut).toLocaleTimeString()
          : '—',
        hoursLabel: entry.totalSeconds
          ? `${Math.round(entry.totalSeconds / 3600)}h`
          : '0h',
      })),
    [attendance],
  );

  const columns = useMemo(
    () => [
      { key: 'employeeName', label: 'Employee' },
      { key: 'departmentName', label: 'Department' },
      { key: 'checkInLabel', label: 'Check In' },
      { key: 'checkOutLabel', label: 'Check Out' },
      { key: 'hoursLabel', label: 'Worked Hours' },
      { key: 'status', label: 'Status' },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        subtitle="Review team attendance and work summaries."
        action={<button className="btn btn-primary">Export</button>}
      />

      {error ? (
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderColor: 'var(--color-danger)',
          }}
        >
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <div
        className="card"
        style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            type="date"
            value={filters.from}
            onChange={(event) => {
              setFilters({ ...filters, from: event.target.value });
              setPage(1);
            }}
          />
          <input
            className="input"
            type="date"
            value={filters.to}
            onChange={(event) => {
              setFilters({ ...filters, to: event.target.value });
              setPage(1);
            }}
          />
          <input
            className="input"
            placeholder="Employee"
            value={filters.employee}
            onChange={(event) => {
              setFilters({ ...filters, employee: event.target.value });
              setPage(1);
            }}
          />
          <input
            className="input"
            placeholder="Department"
            value={filters.department}
            onChange={(event) => {
              setFilters({ ...filters, department: event.target.value });
              setPage(1);
            }}
          />
          <select
            className="input"
            value={filters.status}
            onChange={(event) => {
              setFilters({ ...filters, status: event.target.value });
              setPage(1);
            }}
          >
            <option value="">Status</option>
            <option value="WORKING">Working</option>
            <option value="PAUSED">Paused</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading attendance…</p>
        </div>
      ) : null}

      {!isLoading && !error && !rows.length ? (
        <EmptyState
          title="No attendance found"
          description="Try widening the filter window or check back later."
        />
      ) : null}

      {!isLoading && !error && rows.length ? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            emptyMessage="No attendance data available."
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      ) : null}
    </div>
  );
}
