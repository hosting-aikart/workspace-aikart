import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [{ data: statsData }, { data: employeesData }] =
          await Promise.all([
            api.get('/admin/dashboard'),
            api.get('/admin/employees', { params: { limit: 5 } }),
          ]);

        const summary = statsData?.data || {};
        const payload = employeesData?.data || {};

        setStats([
          {
            label: 'Total Employees',
            value: summary.totalEmployees ?? 0,
            hint: 'Registered workspace users',
          },
          {
            label: 'Active Employees',
            value: summary.activeEmployees ?? 0,
            hint: 'Active accounts',
          },
          {
            label: 'Departments',
            value: summary.departments ?? 0,
            hint: 'Configured teams',
          },
          {
            label: 'Managers',
            value: summary.managerCount ?? 0,
            hint: 'Leadership team',
          },
        ]);
        setEmployees(payload.employees || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summary = useMemo(() => stats, [stats]);

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Real-time workspace analytics, employee management, and operational shortcuts."
        action={
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/employees')}
          >
            + Add Employee
          </button>
        }
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
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading dashboard analytics…</p>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          {/* Stats overview cards */}
          <div
            className="grid grid-4"
            style={{ gap: '1rem', marginBottom: '1.5rem' }}
          >
            {summary.map((item) => (
              <StatsCard
                key={item.label}
                label={item.label}
                value={item.value}
                hint={item.hint}
              />
            ))}
          </div>

          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {/* Quick Actions Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Quick Actions</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Perform key administrative tasks across the workspace.
              </p>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/employees')}
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
                >
                  <span>Manage Employees</span>
                  <span>→</span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/departments')}
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
                >
                  <span>Create Department</span>
                  <span>→</span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/projects')}
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
                >
                  <span>Manage Projects</span>
                  <span>→</span>
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin/announcements')}
                  style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
                >
                  <span>Broadcast Announcement</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Recent Employees Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Recent Employees</h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/admin/employees')}
                >
                  View All →
                </button>
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {employees.length ? (
                  employees.map((employee) => (
                    <div
                      key={employee.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{employee.name}</strong>
                        <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          {employee.department?.name || 'No department'} • {employee.position || employee.role}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <Badge tone={employee.role === 'ADMIN' ? 'danger' : employee.role === 'MANAGER' ? 'warning' : 'primary'}>
                          {employee.role}
                        </Badge>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: employee.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: employee.isActive ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary">
                    No recent employees available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
