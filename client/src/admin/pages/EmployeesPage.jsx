import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

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
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState(null);
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

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/employees', {
        params: {
          search,
          departmentId: departmentFilter,
          role: roleFilter,
          status: statusFilter,
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [departmentFilter, page, roleFilter, search, sortBy, statusFilter]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const tableRows = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        departmentName: employee.department?.name || '—',
        managerName: employee.reportingManager?.name || '—',
        statusLabel: employee.isActive ? 'Active' : 'Inactive',
        roleLabel: employee.role,
        employeeIdValue: employee.employeeId || employee.id,
      })),
    [employees],
  );

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
        setNotice('Employee updated successfully.');
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

  const handleDelete = async () => {
    if (!confirmDeleteEmployee) return;

    setIsDeleting(true);
    setError('');
    setNotice('');

    try {
      await api.delete(`/admin/employees/${confirmDeleteEmployee.id}`);
      setNotice('Employee deactivated successfully.');
      setConfirmDeleteEmployee(null);
      loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
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
      setNotice(`Role updated to ${nextRole}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleStatusChange = async (employee, nextStatus) => {
    try {
      await api.patch(`/admin/employees/${employee.id}/status`, {
        isActive: nextStatus === 'active',
      });
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === employee.id
            ? { ...item, isActive: nextStatus === 'active' }
            : item,
        ),
      );
      setNotice(`Status updated to ${nextStatus}.`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => [
      { key: 'employeeIdValue', label: 'Employee ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'departmentName', label: 'Department' },
      { key: 'position', label: 'Position' },
      { key: 'managerName', label: 'Reporting Manager' },
      { key: 'roleLabel', label: 'Role' },
      { key: 'statusLabel', label: 'Status' },
      {
        key: 'actions',
        label: 'Actions',
        render: (employee) => (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEditEmployee(employee)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDeleteEmployee(employee)}
            >
              Delete
            </button>
            <select
              className="input"
              style={{ minWidth: '110px', padding: '0.25rem 0.5rem' }}
              value={employee.role}
              onChange={(event) =>
                handleRoleChange(employee, event.target.value)
              }
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              className="input"
              style={{ minWidth: '110px', padding: '0.25rem 0.5rem' }}
              value={employee.isActive ? 'active' : 'inactive'}
              onChange={(event) =>
                handleStatusChange(employee, event.target.value)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, roles, and status."
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
          <p style={{ margin: 0 }}>{notice}</p>
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
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <div
        className="card"
        style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search employee"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="input"
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Department</option>
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
          >
            <option value="">Role</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="input"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
          >
            <option value="createdAt">Newest</option>
            <option value="name">Name</option>
            <option value="role">Role</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading employees…</p>
        </div>
      ) : null}

      {!isLoading && !error && !tableRows.length ? (
        <EmptyState
          title="No employees found"
          description="Try a different search or create a new employee."
        />
      ) : null}

      {!isLoading && !error && tableRows.length ? (
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

      <Modal
        open={isModalOpen}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
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
            {isSaving ? 'Saving…' : 'Save'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <input
            className="input"
            placeholder="Full Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <input
            className="input"
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={(event) =>
              setForm({ ...form, employeeId: event.target.value })
            }
          />
          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
          <input
            className="input"
            placeholder="Position"
            value={form.position}
            onChange={(event) =>
              setForm({ ...form, position: event.target.value })
            }
          />
          <select
            className="input"
            value={form.departmentId}
            onChange={(event) =>
              setForm({ ...form, departmentId: event.target.value })
            }
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.reportingManagerId}
            onChange={(event) =>
              setForm({ ...form, reportingManagerId: event.target.value })
            }
          >
            <option value="">Select reporting manager</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            className="input"
            value={form.isActive ? 'active' : 'inactive'}
            onChange={(event) =>
              setForm({ ...form, isActive: event.target.value === 'active' })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input
            className="input"
            placeholder="Joining Date"
            type="date"
            value={form.joiningDate}
            onChange={(event) =>
              setForm({ ...form, joiningDate: event.target.value })
            }
          />
          <input
            className="input"
            placeholder="Temporary Password"
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteEmployee}
        title="Deactivate employee"
        description={`Are you sure you want to deactivate ${confirmDeleteEmployee?.name || 'this employee'}?`}
        onCancel={() => setConfirmDeleteEmployee(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
