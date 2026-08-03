import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Badge from '../components/Badge';

const createDefaultForm = () => ({
  name: '',
  email: '',
  employeeId: '',
  phone: '',
  position: '',
  departmentId: '',
  reportingManagerId: '',
  role: 'EMPLOYEE',
  password: '',
  joiningDate: '',
  isActive: true,
});

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'inactive'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allEmployeesList, setAllEmployeesList] = useState([]); // for manager select options
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(createDefaultForm());

  const loadDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/departments', {
        params: { limit: 100 },
      });
      const payload = data?.data || {};
      setDepartments(payload.departments || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAllEmployeesForSelect = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/employees', {
        params: { limit: 200 },
      });
      const payload = data?.data || {};
      setAllEmployeesList(payload.employees || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/employees', {
        params: {
          search,
          departmentId: departmentFilter,
          role: roleFilter,
          status: activeTab,
          page,
          limit: 10,
          sortBy,
        },
      });
      const payload = data?.data || {};
      setEmployees(payload.employees || []);
      setPagination(
        payload.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      );

      // Fetch summary stats for tab badges
      const { data: statsRes } = await api.get('/admin/dashboard');
      if (statsRes?.data) {
        setActiveCount(statsRes.data.activeEmployees || 0);
        setInactiveCount((statsRes.data.totalEmployees || 0) - (statsRes.data.activeEmployees || 0));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, departmentFilter, page, roleFilter, search, sortBy]);

  useEffect(() => {
    loadDepartments();
    loadAllEmployeesForSelect();
  }, [loadDepartments, loadAllEmployeesForSelect]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setForm(createDefaultForm());
    setIsModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name || '',
      email: employee.email || '',
      employeeId: employee.employeeId || '',
      phone: employee.phone || '',
      position: employee.position || '',
      departmentId: employee.department?.id || '',
      reportingManagerId: employee.reportingManager?.id || '',
      role: employee.role || 'EMPLOYEE',
      password: '',
      joiningDate: employee.joiningDate
        ? employee.joiningDate.slice(0, 10)
        : '',
      isActive: employee.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setForm(createDefaultForm());
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.employeeId) {
      setError('Name, email, and employee ID are required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        name: form.name,
        email: form.email,
        employeeId: form.employeeId,
        phone: form.phone || '',
        position: form.position || '',
        departmentId: form.departmentId || '',
        reportingManagerId: form.reportingManagerId || '',
        role: form.role,
        joiningDate: form.joiningDate || '',
        password: form.password || 'Welcome@123',
      };

      if (editingEmployee) {
        await api.patch(`/admin/employees/${editingEmployee.id}`, payload);
        setNotice('Employee record updated successfully.');
      } else {
        await api.post('/admin/employees', payload);
        setNotice('Employee created successfully.');
      }

      handleCloseModal();
      loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (employee) => {
    const nextStatus = !employee.isActive;
    setError('');
    setNotice('');
    try {
      await api.patch(`/admin/employees/${employee.id}/status`, {
        isActive: nextStatus,
      });
      setNotice(
        nextStatus
          ? `${employee.name} has been activated.`
          : `${employee.name} has been deactivated.`,
      );
      loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRoleChange = async (employee, nextRole) => {
    try {
      await api.patch(`/admin/employees/${employee.id}/role`, {
        role: nextRole,
      });
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === employee.id ? { ...item, role: nextRole } : item,
        ),
      );
      setNotice(`${employee.name}'s role updated to ${nextRole}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const tableRows = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        departmentName: employee.department?.name || '—',
        managerName: employee.reportingManager?.name || '—',
        roleLabel: employee.role,
        employeeIdValue: employee.employeeId || employee.id,
      })),
    [employees],
  );

  const columns = useMemo(
    () => [
      { key: 'employeeIdValue', label: 'Employee ID' },
      {
        key: 'name',
        label: 'Name',
        render: (emp) => (
          <div>
            <strong>{emp.name}</strong>
            <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
              {emp.email}
            </div>
          </div>
        ),
      },
      { key: 'departmentName', label: 'Department' },
      { key: 'position', label: 'Position' },
      { key: 'managerName', label: 'Reporting Manager' },
      {
        key: 'roleLabel',
        label: 'Role',
        render: (emp) => (
          <select
            className="input"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
            value={emp.role}
            onChange={(e) => handleRoleChange(emp, e.target.value)}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (emp) => (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEditEmployee(emp)}
            >
              Edit
            </button>
            <button
              className={`btn btn-sm ${emp.isActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => handleToggleStatus(emp)}
            >
              {emp.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage employee profiles, role assignments, and workspace activation status."
        action={
          <button className="btn btn-primary" onClick={handleAddEmployee}>
            + Add Employee
          </button>
        }
      />

      {notice ? (
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
      ) : null}

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

      {/* Tabs navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('active');
            setPage(1);
          }}
        >
          Active Employees {activeCount > 0 && <Badge tone="secondary">{activeCount}</Badge>}
        </button>
        <button
          className={`btn ${activeTab === 'inactive' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => {
            setActiveTab('inactive');
            setPage(1);
          }}
        >
          Deactivated Employees {inactiveCount > 0 && <Badge tone="warning">{inactiveCount}</Badge>}
        </button>
      </div>

      {/* Filter toolbar */}
      <div
        className="card"
        style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search employee name, email or ID..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <select
            className="input"
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
            style={{ width: '160px' }}
          >
            <option value="">All Departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            style={{ width: '140px' }}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
          <select
            className="input"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            style={{ width: '140px' }}
          >
            <option value="createdAt">Newest First</option>
            <option value="name">Name</option>
            <option value="role">Role</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading employees…</p>
        </div>
      ) : null}

      {!isLoading && !error && tableRows.length === 0 ? (
        <EmptyState
          title={activeTab === 'active' ? 'No active employees' : 'No deactivated employees'}
          description={
            activeTab === 'active'
              ? 'Add a new employee to get started.'
              : 'There are no deactivated employee accounts.'
          }
        />
      ) : null}

      {!isLoading && !error && tableRows.length > 0 ? (
        <>
          <DataTable
            columns={columns}
            rows={tableRows}
            emptyMessage="No employees found."
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      ) : null}

      {/* Create / Edit Employee Modal */}
      <Modal
        open={isModalOpen}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        footer={[
          <button
            key="cancel"
            className="btn btn-outline"
            onClick={handleCloseModal}
          >
            Cancel
          </button>,
          <button
            key="save"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Employee'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Full Name <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="john@aikart.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Employee ID <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="EMP-101"
                value={form.employeeId}
                onChange={(event) => setForm({ ...form, employeeId: event.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Phone Number
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="+1 234 567 890"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Position / Job Title
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="Senior Software Engineer"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Department
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Reporting Manager
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.reportingManagerId}
                onChange={(event) => setForm({ ...form, reportingManagerId: event.target.value })}
              >
                <option value="">Select reporting manager</option>
                {allEmployeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Role
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Joining Date
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                type="date"
                value={form.joiningDate}
                onChange={(event) => setForm({ ...form, joiningDate: event.target.value })}
              />
            </div>
          </div>

          {!editingEmployee && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Temporary Password
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                placeholder="Default: Welcome@123"
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
