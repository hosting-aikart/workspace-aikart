import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [confirmDeleteDepartment, setConfirmDeleteDepartment] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/departments', {
        params: { page, limit: 10 },
      });
      const payload = data?.data || {};
      setDepartments(payload.departments || []);
      setPagination(
        payload.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const handleAddDepartment = () => {
    setEditingDepartment(null);
    setForm({ name: '' });
    setIsModalOpen(true);
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setForm({ name: department.name || '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setForm({ name: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Department name is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      if (editingDepartment) {
        await api.patch(`/admin/departments/${editingDepartment.id}`, {
          name: form.name.trim(),
        });
        setNotice('Department updated successfully.');
      } else {
        await api.post('/admin/departments', { name: form.name.trim() });
        setNotice('Department created successfully.');
      }

      handleCloseModal();
      loadDepartments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteDepartment) return;

    setIsDeleting(true);
    setError('');
    setNotice('');

    try {
      await api.delete(`/admin/departments/${confirmDeleteDepartment.id}`);
      setNotice('Department deleted successfully.');
      setConfirmDeleteDepartment(null);
      loadDepartments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Department ID' },
      { key: 'name', label: 'Department Name' },
      { key: 'employeeCount', label: 'Employee Count' },
      {
        key: 'actions',
        label: 'Actions',
        render: (department) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEditDepartment(department)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDeleteDepartment(department)}
            >
              Delete
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
        title="Departments"
        subtitle="Organize teams and manage department heads."
        action={
          <button className="btn btn-primary" onClick={handleAddDepartment}>
            + Add Department
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

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading departments…</p>
        </div>
      ) : null}

      {!isLoading && !error && !departments.length ? (
        <EmptyState
          title="No departments found"
          description="Create your first department to organize the workspace."
        />
      ) : null}

      {!isLoading && !error && departments.length ? (
        <>
          <DataTable
            columns={columns}
            rows={departments}
            emptyMessage="No departments found."
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
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
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
        <input
          className="input"
          placeholder="Department Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteDepartment}
        title="Delete department"
        description={`Are you sure you want to delete ${confirmDeleteDepartment?.name || 'this department'}?`}
        onCancel={() => setConfirmDeleteDepartment(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
