import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    managerCount: 0,
  });
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

        setMetrics({
          totalEmployees: summary.totalEmployees ?? 0,
          activeEmployees: summary.activeEmployees ?? 0,
          departments: summary.departments ?? 0,
          managerCount: summary.managerCount ?? 0,
        });
        setEmployees(payload.employees || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const metricCards = [
    {
      title: 'Total Workforce',
      value: metrics.totalEmployees,
      hint: 'Registered users in workspace',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: '#4461F2',
      bgColor: 'rgba(68, 97, 242, 0.12)',
    },
    {
      title: 'Active Accounts',
      value: metrics.activeEmployees,
      hint: 'Currently active team members',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.12)',
    },
    {
      title: 'Departments',
      value: metrics.departments,
      hint: 'Configured functional teams',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          <line x1="9" y1="9" x2="11" y2="9" />
          <line x1="9" y1="13" x2="11" y2="13" />
          <line x1="9" y1="17" x2="11" y2="17" />
        </svg>
      ),
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.12)',
    },
    {
      title: 'Leadership & Managers',
      value: metrics.managerCount,
      hint: 'Team managers & supervisors',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        </svg>
      ),
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  const quickActions = [
    {
      title: 'Employee Directory',
      desc: 'Add, edit, or toggle employee activation status',
      icon: '👥',
      path: '/admin/employees',
    },
    {
      title: 'Departments',
      desc: 'Create and organize organizational departments',
      icon: '🏢',
      path: '/admin/departments',
    },
    {
      title: 'Project Portfolio',
      desc: 'Manage team projects, managers, and deadlines',
      icon: '📁',
      path: '/admin/projects',
    },
    {
      title: 'Tasks Hub',
      desc: 'Assign and monitor tasks across workspace projects',
      icon: '✅',
      path: '/admin/tasks',
    },
    {
      title: 'Announcements',
      desc: 'Broadcast targeted updates to all or selected users',
      icon: '📢',
      path: '/admin/announcements',
    },
    {
      title: 'Attendance Dashboard',
      desc: 'Review employee check-in logs and work timers',
      icon: '⏱️',
      path: '/admin/attendance',
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Admin Control Center"
        subtitle="Real-time workspace management, employee controls, and key system metrics."
        action={
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/employees')}
          >
            + Add Employee
          </button>
        }
      />

      {error && (
        <div
          className="card"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderColor: 'var(--color-danger)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading administrative dashboard…</p>
        </div>
      ) : (
        <>
          {/* Metrics summary cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            {metricCards.map((card) => (
              <div
                key={card.title}
                className="card animate-fade-in"
                style={{
                  padding: '1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: card.bgColor,
                    color: card.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <h4
                    className="text-secondary"
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {card.title}
                  </h4>
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      lineHeight: 1.1,
                      margin: '0.2rem 0',
                    }}
                  >
                    {card.value}
                  </div>
                  <p className="text-secondary" style={{ margin: 0, fontSize: '0.78rem' }}>
                    {card.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 340px',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Quick Actions Grid */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  Quick Administrative Actions
                </h3>
                <p className="text-secondary" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                  Direct shortcuts to configure workforce, manage projects, and communicate.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {quickActions.map((act) => (
                  <div
                    key={act.title}
                    onClick={() => navigate(act.path)}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                      background: 'var(--color-bg-subtle, rgba(255, 255, 255, 0.02))',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease-in-out',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                    }}
                    className="hover:border-primary"
                  >
                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{act.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                        {act.title}
                      </div>
                      <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {act.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Employees Widget */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Recent Employees</h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/admin/employees')}
                  style={{ fontSize: '0.8rem' }}
                >
                  View All →
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {employees.length ? (
                  employees.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'rgba(68, 97, 242, 0.15)',
                            color: 'var(--color-primary, #4461F2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}
                        >
                          {emp.name
                            ? emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                            : 'E'}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem', display: 'block' }}>{emp.name}</strong>
                          <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                            {emp.position || emp.department?.name || emp.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Badge tone={emp.role === 'ADMIN' ? 'danger' : emp.role === 'MANAGER' ? 'warning' : 'primary'}>
                          {emp.role}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    No recent employees found.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
