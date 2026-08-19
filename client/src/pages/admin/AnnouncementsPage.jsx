import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';

const createDefaultForm = () => ({
  title: '',
  description: '',
  priority: 'MEDIUM',
  selectedUserIds: [],
  status: 'PUBLISHED',
});

const getPriorityTone = (priority) => {
  switch (priority) {
    case 'URGENT':
      return 'danger';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'primary';
    case 'LOW':
      return 'secondary';
    default:
      return 'primary';
  }
};

const getStatusTone = (status) => {
  switch (status) {
    case 'PUBLISHED':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'ARCHIVED':
      return 'secondary';
    default:
      return 'primary';
  }
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modals & Dialogs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [form, setForm] = useState(createDefaultForm());

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/announcements', {
        params: {
          search,
          priority: priorityFilter,
          status: statusFilter,
        },
      });
      setAnnouncements(data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, [priorityFilter, search, statusFilter]);

  const loadEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/employees', { params: { limit: 200 } });
      const payload = data?.data || {};
      setEmployees(payload.employees || []);
    } catch (err) {
      console.error('Failed to load employees list:', err);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreateNew = () => {
    setEditingAnnouncement(null);
    setForm(createDefaultForm());
    setEmployeeSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingAnnouncement(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      priority: item.priority || 'MEDIUM',
      // Older announcements created before the recipient picker existed may
      // be targetType 'ALL' with no selectedUsers rows at all — pre-select
      // every current employee for those so re-saving an old broadcast
      // without touching the audience still reaches everyone, instead of
      // silently narrowing it down to nobody.
      selectedUserIds: item.targetType === 'ALL'
        ? employees.map((e) => e.id)
        : (item.selectedUsers ? item.selectedUsers.map((su) => su.userId || su.user?.id) : []),
      status: item.status || 'PUBLISHED',
    });
    setEmployeeSearch('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setForm(createDefaultForm());
    setEmployeeSearch('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }

    if (!form.selectedUserIds || form.selectedUserIds.length === 0) {
      setError('Please select at least one recipient.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        targetType: 'SELECTED_USERS',
        selectedUserIds: form.selectedUserIds,
        status: form.status,
      };

      if (editingAnnouncement) {
        await api.patch(`/announcements/${editingAnnouncement.id}`, payload);
        setNotice('Announcement updated successfully.');
      } else {
        await api.post('/announcements', payload);
        setNotice('Announcement created successfully.');
      }

      handleCloseModal();
      loadAnnouncements();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setError('');
    setNotice('');

    try {
      await api.delete(`/announcements/${confirmDelete.id}`);
      setNotice('Announcement deleted successfully.');
      setConfirmDelete(null);
      loadAnnouncements();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete announcement.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setForm((prev) => {
      const current = prev.selectedUserIds || [];
      const exists = current.includes(userId);
      const updated = exists ? current.filter((id) => id !== userId) : [...current, userId];
      return { ...prev, selectedUserIds: updated };
    });
  };

  const handleSelectAllEmployees = () => {
    setForm((prev) =>
      prev.selectedUserIds?.length === employees.length
        ? { ...prev, selectedUserIds: [] }
        : { ...prev, selectedUserIds: employees.map((e) => e.id) },
    );
  };

  const filteredEmployeesForModal = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const term = employeeSearch.toLowerCase();
    return employees.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(term)) ||
        (emp.email && emp.email.toLowerCase().includes(term)) ||
        (emp.position && emp.position.toLowerCase().includes(term)),
    );
  }, [employees, employeeSearch]);

  const tableRows = useMemo(
    () =>
      announcements.map((item) => {
        const targetLabel =
          item.targetType === 'ALL'
            ? 'All Employees'
            : `Selected Employees (${item.selectedUsers?.length || 0})`;
        const createdByName = item.createdBy?.name || 'Admin';
        const formattedDate = item.createdAt
          ? new Date(item.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : '—';

        return {
          ...item,
          targetLabel,
          createdByName,
          formattedDate,
        };
      }),
    [announcements],
  );

  const columns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Title',
        render: (item) => (
          <div>
            <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>
              {item.description.length > 70
                ? item.description.slice(0, 70) + '…'
                : item.description}
            </p>
          </div>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (item) => (
          <Badge tone={getPriorityTone(item.priority)}>{item.priority}</Badge>
        ),
      },
      { key: 'targetLabel', label: 'Target' },
      { key: 'createdByName', label: 'Created By' },
      { key: 'formattedDate', label: 'Created At' },
      {
        key: 'status',
        label: 'Status',
        render: (item) => (
          <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (item) => (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setViewingAnnouncement(item)}
            >
              View
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEdit(item)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDelete(item)}
            >
              Archive/Delete
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
        title="Announcements"
        subtitle="Create, manage and broadcast internal announcements to employees."
        action={
          <button className="btn btn-primary" onClick={handleCreateNew}>
            + Create Announcement
          </button>
        }
      />

      {notice && (
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
      )}

      {error && (
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
      )}

      {/* Filters bar */}
      <div
        className="card"
        style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search announcement title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: '240px', flex: 1 }}
          />
          <select
            className="input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading announcements…</p>
        </div>
      ) : null}

      {!isLoading && tableRows.length === 0 ? (
        <EmptyState
          title="No announcements found"
          description="Create your first announcement to share updates with team members."
        />
      ) : null}

      {!isLoading && tableRows.length > 0 ? (
        <DataTable
          columns={columns}
          rows={tableRows}
          emptyMessage="No announcements found."
        />
      ) : null}

      {/* Create / Edit Modal */}
      <Modal
        open={isModalOpen}
        title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
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
            {isSaving ? 'Saving…' : editingAnnouncement ? 'Update Announcement' : 'Publish Announcement'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>
              Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="e.g. Annual Company Offsite 2026 Announcement"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>
              Description / Message <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
              placeholder="Enter announcement details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>
                Priority
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem' }}>
                Status
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Recipients — always visible, no separate "Share To" scope
              selector. "All Employees" is just "select everyone" inside
              this same picker (via the button below) instead of a whole
              separate targeting mode, matching how the employee-side
              broadcast composer already works. */}
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-subtle, rgba(255, 255, 255, 0.03))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600, margin: 0 }}>
                Recipients <span style={{ color: 'var(--color-danger)' }}>*</span> ({form.selectedUserIds?.length || 0} selected)
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSelectAllEmployees}
              >
                {form.selectedUserIds?.length === employees.length ? 'Deselect All' : 'Select All Employees'}
              </button>
            </div>

            <input
              className="input"
              style={{ width: '100%', marginBottom: '0.75rem' }}
              placeholder="Search employees by name, email or position..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'grid',
                gap: '0.4rem',
                paddingRight: '0.25rem',
              }}
            >
              {filteredEmployeesForModal.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
                  No employees found matching search.
                </p>
              ) : (
                filteredEmployeesForModal.map((emp) => {
                  const isChecked = form.selectedUserIds?.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? 'rgba(68, 97, 242, 0.12)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUserSelection(emp.id)}
                      />
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{emp.name}</span>
                      <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        ({emp.position || emp.role} — {emp.email})
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        open={!!viewingAnnouncement}
        title="Announcement Details"
        footer={[
          <button
            key="close"
            className="btn btn-outline"
            onClick={() => setViewingAnnouncement(null)}
          >
            Close
          </button>,
        ]}
      >
        {viewingAnnouncement && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Badge tone={getPriorityTone(viewingAnnouncement.priority)}>
                  {viewingAnnouncement.priority} Priority
                </Badge>
                <Badge tone={getStatusTone(viewingAnnouncement.status)}>
                  {viewingAnnouncement.status}
                </Badge>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{viewingAnnouncement.title}</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', margin: 0 }}>
                Created by <strong>{viewingAnnouncement.createdByName}</strong> on {viewingAnnouncement.formattedDate}
              </p>
            </div>

            <div
              style={{
                background: 'var(--color-bg-subtle, rgba(255, 255, 255, 0.03))',
                padding: '1rem',
                borderRadius: '8px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {viewingAnnouncement.description}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>Target Audience</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {viewingAnnouncement.targetType === 'ALL'
                  ? 'Company-wide (All Employees)'
                  : `Targeted to ${viewingAnnouncement.selectedUsers?.length || 0} selected employee(s)`}
              </p>

              {viewingAnnouncement.selectedUsers && viewingAnnouncement.selectedUsers.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {viewingAnnouncement.selectedUsers.map((su) => (
                    <span
                      key={su.id || su.userId}
                      style={{
                        padding: '0.2rem 0.55rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        background: 'rgba(68, 97, 242, 0.15)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {su.user?.name || su.user?.email || su.userId}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.95rem' }}>Read Tracking</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Total Read Receipts: <strong>{viewingAnnouncement._count?.readRecords || 0}</strong>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${confirmDelete?.title || 'this announcement'}"?`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
