import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function ReportsPage() {
  const [reportStats, setReportStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/reports');
        const payload = data?.data || {};
        setReportStats([
          {
            label: 'Total Employees',
            value: payload.totalEmployees ?? 0,
            hint: 'Workspace users',
          },
          {
            label: 'Attendance %',
            value: payload.attendanceRate ? `${payload.attendanceRate}%` : '0%',
            hint: 'Average daily attendance',
          },
          {
            label: 'Department Distribution',
            value: payload.departmentCount ?? 0,
            hint: 'Teams across workspace',
          },
          {
            label: 'Active Employees',
            value: payload.activeEmployees ?? 0,
            hint: 'Currently active',
          },
        ]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, []);

  const stats = useMemo(() => reportStats, [reportStats]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Placeholder reporting view for admin analytics."
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

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading reports…</p>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="grid grid-4" style={{ gap: '1rem' }}>
          {stats.map((item) => (
            <StatsCard
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
