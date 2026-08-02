import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function AdminDashboard() {
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
            hint: 'Workspace users',
          },
          {
            label: 'Active Employees',
            value: summary.activeEmployees ?? 0,
            hint: 'Currently active',
          },
          {
            label: 'Departments',
            value: summary.departments ?? 0,
            hint: 'Configured teams',
          },
          {
            label: 'Managers',
            value: summary.managerCount ?? 0,
            hint: 'Leadership count',
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
        subtitle="Overview of the workspace, people, and operations."
        action={<button className="btn btn-primary">+ Add Employee</button>}
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
          <p className="text-secondary">Loading dashboard…</p>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <div
            className="grid grid-4"
            style={{ gap: '1rem', marginBottom: '1rem' }}
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

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <button className="btn btn-outline">Create Department</button>
                <button className="btn btn-outline">Create Project</button>
                <button className="btn btn-outline">Send Announcement</button>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginTop: 0 }}>Recent Employees</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {employees.length ? (
                  employees.map((employee) => (
                    <div
                      key={employee.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <strong>{employee.name}</strong>
                        <span className="badge badge-primary">
                          {employee.role}
                        </span>
                      </div>
                      <p
                        className="text-secondary"
                        style={{ marginTop: '0.25rem', marginBottom: 0 }}
                      >
                        {employee.department?.name || '—'}
                      </p>
                      <p className="text-sm" style={{ marginTop: '0.25rem' }}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </p>
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
