import { useEffect, useMemo, useState, useCallback } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function AttendanceManagement() {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    workingCount: 0,
    pausedCount: 0,
    checkedOutCount: 0,
    totalSeconds: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [filters, setFilters] = useState({
    from: '',
    to: '',
    employee: '',
    department: '',
    status: '',
  });

  // Modal State for adjusting attendance
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({
    checkIn: '',
    checkOut: '',
    status: 'WORKING',
  });

  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/departments', {
        params: { limit: 100 },
      });
      const payload = data?.data || {};
      setDepartments(payload.departments || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/attendance/stats', {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
        },
      });
      setStats(data?.data || {
        totalRecords: 0,
        workingCount: 0,
        pausedCount: 0,
        checkedOutCount: 0,
        totalSeconds: 0,
      });
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, [filters.from, filters.to]);

  const loadAttendance = useCallback(async () => {
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
  }, [filters, page]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadStats();
    loadAttendance();
  }, [loadStats, loadAttendance]);

  const formatHours = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    // Format check-in and check-out dates to YYYY-MM-DDThh:mm for datetime-local input format
    const formatDateTime = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      // Adjust to local time string offset
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}-${minutes}`.replace('-', '/').replace('-', '/'); // standard browser formatting
    };

    // Standard datetime-local standard format: YYYY-MM-DDTHH:MM
    const toLocalDateTimeString = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
    };

    setForm({
      checkIn: toLocalDateTimeString(record.checkIn),
      checkOut: toLocalDateTimeString(record.checkOut),
      status: record.status || 'WORKING',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingRecord) return;
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        status: form.status,
        checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : null,
        checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : null,
      };

      await api.patch(`/admin/attendance/${editingRecord.id}`, payload);
      setNotice(`Successfully adjusted attendance logs for ${editingRecord.user?.name}.`);
      setIsModalOpen(false);
      loadAttendance();
      loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'WORKING':
        return <Badge tone="success">Active Working</Badge>;
      case 'PAUSED':
        return <Badge tone="warning">On Break</Badge>;
      case 'CHECKED_OUT':
        return <Badge tone="primary">Checked Out</Badge>;
      default:
        return <Badge tone="secondary">{status || '—'}</Badge>;
    }
  };

  const tableRows = useMemo(
    () =>
      attendance.map((entry) => ({
        ...entry,
        employeeName: entry.user?.name || '—',
        departmentName: entry.user?.department?.name || '—',
        checkInLabel: entry.checkIn
          ? new Date(entry.checkIn).toLocaleTimeString(undefined, { timeStyle: 'short' })
          : '—',
        checkOutLabel: entry.checkOut
          ? new Date(entry.checkOut).toLocaleTimeString(undefined, { timeStyle: 'short' })
          : '—',
        dateLabel: entry.date
          ? new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
          : '—',
        hoursLabel: entry.totalSeconds ? formatHours(entry.totalSeconds) : '0h 0m',
      })),
    [attendance],
  );

  const columns = useMemo(
    () => [
      {
        key: 'employeeName',
        label: 'Employee',
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(68, 97, 242, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {row.user?.name ? row.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'E'}
            </div>
            <div>
              <strong>{row.employeeName}</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                {row.user?.email}
              </div>
            </div>
          </div>
        ),
      },
      { key: 'departmentName', label: 'Department' },
      { key: 'dateLabel', label: 'Work Date' },
      { key: 'checkInLabel', label: 'Check In' },
      { key: 'checkOutLabel', label: 'Check Out' },
      { key: 'hoursLabel', label: 'Logged Time' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => getStatusLabel(row.status),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleEdit(row)}
          >
            Adjust Time
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Workforce Attendance Dashboard"
        subtitle="Manage daily sign-ins, breaks, checked-out shifts, and time overrides."
      />

      {notice && (
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderColor: 'var(--color-success)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-success)' }}>{notice}</p>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderColor: 'var(--color-danger)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {/* Summary dashboard row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE WORKING</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0 0 0' }}>{stats.workingCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>ON BREAK / PAUSED</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0 0 0' }}>{stats.pausedCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>COMPLETED SHIFTS</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4461F2', margin: '0.2rem 0 0 0' }}>{stats.checkedOutCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>TOTAL LOGGED HOURS</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{formatHours(stats.totalSeconds)}</div>
        </div>
      </div>

      {/* Filters Card */}
      <div
        className="card"
        style={{ padding: '1.1rem 1.35rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.45rem', flex: 1, minWidth: '240px' }}>
            <input
              className="input"
              type="date"
              value={filters.from}
              onChange={(event) => {
                setFilters({ ...filters, from: event.target.value });
                setPage(1);
              }}
              style={{ flex: 1 }}
            />
            <span style={{ alignSelf: 'center', color: 'var(--color-text-secondary)' }}>to</span>
            <input
              className="input"
              type="date"
              value={filters.to}
              onChange={(event) => {
                setFilters({ ...filters, to: event.target.value });
                setPage(1);
              }}
              style={{ flex: 1 }}
            />
          </div>
          <input
            className="input"
            placeholder="Search employee name..."
            value={filters.employee}
            onChange={(event) => {
              setFilters({ ...filters, employee: event.target.value });
              setPage(1);
            }}
            style={{ width: '220px' }}
          />
          {departments.length > 0 && (
            <select
              className="input"
              value={filters.department}
              onChange={(event) => {
                setFilters({ ...filters, department: event.target.value });
                setPage(1);
              }}
              style={{ width: '160px' }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="input"
            value={filters.status}
            onChange={(event) => {
              setFilters({ ...filters, status: event.target.value });
              setPage(1);
            }}
            style={{ width: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="WORKING">Working</option>
            <option value="PAUSED">Paused</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading attendance data…</p>
        </div>
      ) : null}

      {!isLoading && !error && !tableRows.length ? (
        <EmptyState
          title="No attendance records found"
          description="Try broadening the filter date range or adjust your search filters."
        />
      ) : null}

      {!isLoading && !error && tableRows.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            rows={tableRows}
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

      {/* Adjust Attendance Overlay Modal */}
      <Modal
        open={isModalOpen}
        title={editingRecord ? `Adjust Attendance: ${editingRecord.user?.name}` : 'Adjust Attendance'}
        footer={[
          <button
            key="cancel"
            className="btn btn-outline"
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>,
          <button
            key="save"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving Adjustments…' : 'Save Changes'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Check-In Timestamp
            </label>
            <input
              className="input"
              type="datetime-local"
              style={{ width: '100%' }}
              value={form.checkIn}
              onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Check-Out Timestamp
            </label>
            <input
              className="input"
              type="datetime-local"
              style={{ width: '100%' }}
              value={form.checkOut}
              onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Attendance status
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="WORKING">Working (Checked In)</option>
              <option value="PAUSED">Paused (On Break)</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
