import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getRoleTone(role) {
  switch (role) {
    case 'ADMIN':
      return 'danger';
    case 'MANAGER':
      return 'warning';
    default:
      return 'primary';
  }
}

export default function DirectoryPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [{ data: usersRes }, { data: deptRes }] = await Promise.all([
        api.get('/me/directory', { params: { limit: 200 } }).catch(() =>
          api.get('/admin/employees', { params: { limit: 200 } }),
        ),
        api.get('/admin/departments', { params: { limit: 100 } }).catch(() => ({
          data: { data: { departments: [] } },
        })),
      ]);

      const userList = usersRes?.data?.employees || usersRes?.data || [];
      const deptList = deptRes?.data?.departments || deptRes?.data || [];

      setUsers(Array.isArray(userList) ? userList : []);
      setDepartments(Array.isArray(deptList) ? deptList : []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load directory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (departmentFilter && u.department?.id !== departmentFilter) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.employeeId?.toLowerCase().includes(query) ||
        u.position?.toLowerCase().includes(query) ||
        u.department?.name?.toLowerCase().includes(query)
      );
    });
  }, [users, departmentFilter, roleFilter, search]);

  return (
    <div className="admin-dashboard-container">
      <PageHeader
        title="Company Directory"
        subtitle="Browse workspace members, department structures, role assignments, and contact information."
      />

      {error ? (
        <div
          className="card"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderColor: 'var(--color-danger, #EF4444)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-danger, #EF4444)' }}>{error}</p>
        </div>
      ) : null}

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Search by name, email, employee ID or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />
          {departments.length > 0 && (
            <select
              className="input"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <select
            className="input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'grid', gap: '0.3rem' }}>
                  <div className="skeleton-box" style={{ width: '70%', height: '16px' }} />
                  <div className="skeleton-box" style={{ width: '40%', height: '12px' }} />
                </div>
              </div>
              <div className="skeleton-box" style={{ width: '90%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '60%', height: '14px' }} />
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No colleagues found"
          description={
            search || departmentFilter || roleFilter
              ? 'Try adjusting your search query or filter options.'
              : 'No members currently listed in the workspace directory.'
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredUsers.map((member) => (
            <div
              key={member.id}
              className="card animate-fade-in"
              style={{
                padding: '1.35rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                transition: 'transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <div>
                {/* Avatar & Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: 'var(--color-primary-light, rgba(68, 97, 242, 0.1))',
                        color: 'var(--color-primary, #4461F2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                      }}
                    >
                      {member.profilePhotoUrl ? (
                        <img
                          src={member.profilePhotoUrl}
                          alt={member.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(member.name)
                      )}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: member.isActive ? '#22c55e' : '#9ca3af',
                        border: '2px solid var(--color-surface, #ffffff)',
                      }}
                      title={member.isActive ? 'Active Member' : 'Inactive Account'}
                    />
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--color-text, #1F2937)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.name}
                      </h4>
                      <Badge tone={getRoleTone(member.role)}>{member.role}</Badge>
                    </div>
                    <p
                      className="text-secondary"
                      style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', fontWeight: 500 }}
                    >
                      {member.position || member.department?.name || 'Workspace Member'}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'grid', gap: '0.45rem', fontSize: '0.83rem', borderTop: '1px solid var(--color-border, #E5E7EB)', paddingTop: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <a
                      href={`mailto:${member.email}`}
                      style={{
                        color: 'var(--color-primary, #4461F2)',
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                      }}
                    >
                      {member.email}
                    </a>
                  </div>

                  {member.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <a href={`tel:${member.phone}`} style={{ color: 'var(--color-text, #1F2937)', textDecoration: 'none' }}>
                        {member.phone}
                      </a>
                    </div>
                  )}

                  {member.department?.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                        <path d="M3 21h18" />
                        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                      </svg>
                      <span className="text-secondary">{member.department.name}</span>
                    </div>
                  )}

                  {member.employeeId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="7" y1="8" x2="17" y2="8" />
                        <line x1="7" y1="12" x2="13" y2="12" />
                      </svg>
                      <span className="text-secondary">ID: {member.employeeId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
