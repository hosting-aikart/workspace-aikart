import { useEffect, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReports = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/reports');
      setReportData(data?.data || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExport = () => {
    if (!reportData) return;

    const csvRows = [
      ['Metric', 'Value', 'Description'],
      ['Total Employees', stats.totalEmployees, 'Registered workspace users'],
      ['Active Employees', stats.activeEmployees, 'Currently active employees'],
      ['Configured Departments', stats.departments, 'Operational departments'],
      ['Active Managers', stats.managerCount, 'Active team managers'],
      ['Attendance Records Logged', attendance.totalRecords, 'Total attendance entries'],
      ['Currently Working', attendance.workingCount, 'Employees actively clocked in'],
      ['On Break / Paused', attendance.pausedCount, 'Employees on breaks'],
      ['Completed Shifts', attendance.checkedOutCount, 'Clocked out shifts'],
      ['Total Hours Logged', `${hoursLogged} hrs`, 'Accumulated working hours'],
      ['Workspace Check-in Rate', `${checkInRate}%`, 'Overall presence percentage'],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `workspace_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotice('CSV report downloaded successfully!');
    setTimeout(() => setNotice(''), 3000);
  };

  const stats = reportData?.summary || {
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    managerCount: 0,
  };

  const attendance = reportData?.attendance || {
    totalRecords: 0,
    workingCount: 0,
    pausedCount: 0,
    checkedOutCount: 0,
    totalSeconds: 0,
  };

  const checkInRate = stats.activeEmployees > 0
    ? Math.round((attendance.workingCount / stats.activeEmployees) * 100)
    : 0;

  const hoursLogged = Math.round(attendance.totalSeconds / 3600);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Workspace Performance Reports"
        subtitle="Review attendance benchmarks, department sizes, check-in history, and workforce metrics."
        action={
          <button className="btn btn-primary" onClick={handleExport}>
            Export Report CSV
          </button>
        }
      />

      {notice && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-success)' }}>
          <p style={{ margin: 0, color: 'var(--color-success)' }}>{notice}</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderColor: 'var(--color-danger)' }}>
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Generating system reports analytics…</p>
        </div>
      ) : (
        <>
          {/* Summary stats grid */}
          <div className="grid grid-4" style={{ gap: '1rem', marginBottom: '1.75rem' }}>
            <StatsCard
              label="Workforce Capacity"
              value={`${stats.activeEmployees} / ${stats.totalEmployees}`}
              hint="Active vs registered staff"
            />
            <StatsCard
              label="Workspace Check-in Rate"
              value={`${checkInRate}%`}
              hint="Active working staff today"
            />
            <StatsCard
              label="Staff Breaks Today"
              value={attendance.pausedCount}
              hint="Staff currently on break"
            />
            <StatsCard
              label="Time Logged Today"
              value={`${hoursLogged} hrs`}
              hint="Accumulated working hours"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Visual SVGs Dashboard */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700 }}>Attendance Engagement Index</h3>
              <p className="text-secondary" style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
                Comparison of daily check-in statuses across the workspace.
              </p>

              <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: attendance.totalRecords > 0 ? `${(attendance.workingCount / attendance.totalRecords) * 160}px` : '10px',
                      background: 'linear-gradient(180deg, #22c55e, #15803d)',
                      borderRadius: '6px 6px 0 0',
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active ({attendance.workingCount})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: attendance.totalRecords > 0 ? `${(attendance.pausedCount / attendance.totalRecords) * 160}px` : '10px',
                      background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                      borderRadius: '6px 6px 0 0',
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>On Break ({attendance.pausedCount})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: attendance.totalRecords > 0 ? `${(attendance.checkedOutCount / attendance.totalRecords) * 160}px` : '10px',
                      background: 'linear-gradient(180deg, #4461F2, #2a44c8)',
                      borderRadius: '6px 6px 0 0',
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Completed ({attendance.checkedOutCount})</span>
                </div>
              </div>
            </div>

            {/* Department Summary Metrics */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700 }}>Department Benchmarks</h3>
              <p className="text-secondary" style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem' }}>
                Operational departments and leaders logged in workspace.
              </p>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Configured Departments</span>
                  <strong style={{ fontSize: '1.1rem' }}>{stats.departments}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Active Team Managers</span>
                  <strong style={{ fontSize: '1.1rem' }}>{stats.managerCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Registered Employees</span>
                  <strong style={{ fontSize: '1.1rem' }}>{stats.totalEmployees}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
