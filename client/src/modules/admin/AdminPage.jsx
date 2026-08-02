import { useMemo } from 'react';

const stats = [
  { label: 'Total Users', value: '124', change: '+8.2%' },
  { label: 'Active Employees', value: '96', change: '+3.1%' },
  { label: 'Pending Requests', value: '14', change: '5 new today' },
  { label: 'Departments', value: '6', change: '2 added' },
];

const recentUsers = [
  {
    name: 'Aisha Khan',
    role: 'Manager',
    email: 'aisha@aikart.com',
    status: 'Active',
  },
  {
    name: 'Rohan Verma',
    role: 'Employee',
    email: 'rohan@aikart.com',
    status: 'Pending',
  },
  {
    name: 'Neha Singh',
    role: 'Admin',
    email: 'neha@aikart.com',
    status: 'Active',
  },
];

export default function AdminPage() {
  const summary = useMemo(() => stats, []);

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Administration</p>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Manage workspace users, access, and daily operations.
          </p>
        </div>
        <button className="btn btn-primary">+ Add User</button>
      </div>

      <div className="grid grid-4" style={{ gap: '1rem', marginTop: '1.5rem' }}>
        {summary.map((item) => (
          <div
            key={item.label}
            className="card"
            style={{ padding: '1rem 1.25rem' }}
          >
            <p className="text-secondary" style={{ marginBottom: '0.4rem' }}>
              {item.label}
            </p>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{item.value}</h2>
            <p
              className="text-sm text-primary"
              style={{ marginTop: '0.35rem' }}
            >
              {item.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ gap: '1rem', marginTop: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div
            className="flex justify-between items-center"
            style={{ marginBottom: '1rem' }}
          >
            <h3 style={{ margin: 0 }}>Quick Actions</h3>
            <span className="badge badge-primary">Admin Tools</span>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button className="btn btn-outline">Manage Roles</button>
            <button className="btn btn-outline">
              View Department Settings
            </button>
            <button className="btn btn-outline">
              Review Attendance Reports
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div
            className="flex justify-between items-center"
            style={{ marginBottom: '1rem' }}
          >
            <h3 style={{ margin: 0 }}>Recent Users</h3>
            <span className="badge badge-secondary">Updated today</span>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {recentUsers.map((user) => (
              <div
                key={user.email}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                }}
              >
                <div className="flex justify-between items-center">
                  <strong>{user.name}</strong>
                  <span className="badge badge-primary">{user.role}</span>
                </div>
                <p
                  className="text-secondary"
                  style={{ marginTop: '0.25rem', marginBottom: 0 }}
                >
                  {user.email}
                </p>
                <p className="text-sm" style={{ marginTop: '0.25rem' }}>
                  {user.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
