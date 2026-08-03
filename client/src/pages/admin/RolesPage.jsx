import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function RolesPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/employees', {
          params: { limit: 100 },
        });
        const payload = data?.data || {};
        setEmployees(payload.employees || []);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, []);

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

  const rows = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        currentRole: employee.role,
        statusLabel: employee.isActive ? 'Active' : 'Inactive',
      })),
    [employees],
  );

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Employee' },
      { key: 'currentRole', label: 'Current Role' },
      {
        key: 'changeRole',
        label: 'Change Role',
        render: (employee) => (
          <select
            className="input"
            value={employee.role}
            onChange={(event) => handleRoleChange(employee, event.target.value)}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        ),
      },
      { key: 'statusLabel', label: 'Status' },
    ],
    [employees],
  );

  return (
    <div>
      <PageHeader title="Roles" subtitle="Adjust access roles for employees." />

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

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading roles…</p>
        </div>
      ) : null}

      {!isLoading && !error && !rows.length ? (
        <EmptyState
          title="No employees available"
          description="Create employees first to manage roles."
        />
      ) : null}

      {!isLoading && !error && rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage="No role updates pending."
        />
      ) : null}
    </div>
  );
}
