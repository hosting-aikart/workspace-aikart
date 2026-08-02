import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/employees', label: 'Employees' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/roles', label: 'Roles' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/projects', label: 'Projects' },
  { to: '/admin/tasks', label: 'Tasks' },
  { to: '/admin/meetings', label: 'Meetings' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/reports', label: 'Reports' },
];

export default function AdminLayout() {
  return (
    <div className="page-content animate-fade-in">
      <div
        className="card"
        style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
