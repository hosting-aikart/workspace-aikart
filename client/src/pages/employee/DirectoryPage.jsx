import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function DirectoryPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Editing state for Manager operations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState({
    position: '',
    phone: '',
    departmentId: '',
  });

  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/departments', {
        params: { limit: 100 },
      });
      const payload = data?.data || {};
      setDepartments(payload.departments || []);
    } catch (err) {
      // Non-admin may fail to fetch admin departments list
      console.log('Admin department list not accessible for this role');
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/me/directory', {
        params: { limit: 100 },
      });
      const payload = data?.data;
      setEmployees(Array.isArray(payload) ? payload : payload?.employees || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
    loadEmployees();
  }, [loadDepartments, loadEmployees]);

  const handleEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setForm({
      position: emp.position || '',
      phone: emp.phone || '',
      departmentId: emp.department?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingEmployee) return;
    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const endpoint =
        user?.role === 'ADMIN'
          ? `/admin/employees/${editingEmployee.id}`
          : `/manager/team/${editingEmployee.id}`;

      await api.patch(endpoint, form);
      setNotice(`Updated details for ${editingEmployee.name} successfully.`);
      setIsModalOpen(false);
      loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (departmentFilter && emp.department?.id !== departmentFilter) return false;
      if (roleFilter && emp.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        emp.name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.employeeId?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    });
  }, [employees, departmentFilter, roleFilter, search]);

  const columns = [
    {
      key: 'employeeId',
      label: 'Employee ID',
      render: (emp) => emp.employeeId || emp.id.slice(0, 8),
    },
    {
      key: 'name',
      label: 'Employee',
      render: (emp) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
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
              flexShrink: 0,
            }}
          >
            {emp.name
              ? emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
              : 'E'}
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem' }}>{emp.name}</strong>
            <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
              {emp.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      render: (emp) => emp.position || '—',
    },
    {
      key: 'department',
      label: 'Department',
      render: (emp) => emp.department?.name || '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (emp) => emp.phone || '—',
    },
    {
      key: 'role',
      label: 'Role',
      render: (emp) => (
        <Badge tone={emp.role === 'ADMIN' ? 'danger' : emp.role === 'MANAGER' ? 'warning' : 'primary'}>
          {emp.role}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (emp) => (
        <div>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEditEmployee(emp)}
            >
              Update Info
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Employee Directory"
        subtitle="Browse workspace members, organizational positions, and team contacts."
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

      {/* Filters toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />
          {departments.length > 0 && (
            <select
              className="input"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '140px' }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading directory…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredEmployees}
          emptyMessage="No employees found in directory."
        />
      )}

      {/* Edit Employee Info Modal */}
      <Modal
        open={isModalOpen}
        title={editingEmployee ? `Update Info: ${editingEmployee.name}` : 'Update Employee'}
        footer={[
          <button key="cancel" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </button>,
          <button key="save" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Position / Job Title
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="e.g. Senior Frontend Developer"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Phone Number
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="+1 234 567 890"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {departments.length > 0 && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
                Department
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
