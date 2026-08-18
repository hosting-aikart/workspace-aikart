import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const createDefaultForm = () => ({
  name: '',
  description: '',
  status: 'ACTIVE',
  priority: 'MEDIUM',
  progress: 0,
  startDate: '',
  deadline: '',
});

const getEmployeeDisplayName = (employee) =>
  employee?.name || employee?.email || 'Unnamed employee';
const getEmployeeInitials = (employee) => {
  const name = getEmployeeDisplayName(employee);
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed.';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmArchiveProject, setConfirmArchiveProject] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [managerId, setManagerId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState([]);
  const [teamMemberSearch, setTeamMemberSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/projects', {
        params: {
          search,
          status: statusFilter,
          priority: priorityFilter,
          page,
          limit: 10,
        },
      });
      const payload = data?.data || {};
      setProjects(Array.isArray(payload.projects) ? payload.projects : []);
      setPagination(
        payload.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      );
    } catch (err) {
      const message = getErrorMessage(err);
      setProjects([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, priorityFilter, search, statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!isModalOpen) return;

    const loadEmployees = async () => {
      setIsEmployeeLoading(true);
      setEmployeeError('');
      try {
        const { data } = await api.get('/admin/employees', {
          params: {
            status: 'active',
            limit: 200,
          },
        });
        const payload = Array.isArray(data?.data?.employees)
          ? data.data.employees
          : [];
        setEmployeeOptions(payload);
      } catch (err) {
        setEmployeeOptions([]);
        setEmployeeError(getErrorMessage(err));
      } finally {
        setIsEmployeeLoading(false);
      }
    };

    loadEmployees();
  }, [isModalOpen]);

  const sortedEmployeeOptions = useMemo(() => {
    return [...employeeOptions].sort((left, right) => {
      const leftPriority = left.role === 'MANAGER' ? 0 : 1;
      const rightPriority = right.role === 'MANAGER' ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return (left.name || left.email || '').localeCompare(
        right.name || right.email || '',
      );
    });
  }, [employeeOptions]);

  const filteredEmployeeOptions = useMemo(() => {
    const query = teamMemberSearch.trim().toLowerCase();

    return sortedEmployeeOptions.filter((employee) => {
      if (!query) return true;
      const haystack =
        `${employee.name || ''} ${employee.employeeId || ''} ${employee.email || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedEmployeeOptions, teamMemberSearch]);

  const handleAddProject = () => {
    setEditingProject(null);
    setForm(createDefaultForm());
    setManagerId('');
    setTeamMemberIds([]);
    setTeamMemberSearch('');
    setIsModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'ACTIVE',
      priority: project.priority || 'MEDIUM',
      progress: project.progress || 0,
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      deadline: project.deadline ? project.deadline.slice(0, 10) : '',
    });
    setManagerId(project.manager?.id || '');
    setTeamMemberIds(
      Array.isArray(project.members)
        ? project.members.map((member) => member.user?.id).filter(Boolean)
        : [],
    );
    setTeamMemberSearch('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setForm(createDefaultForm());
    setManagerId('');
    setTeamMemberIds([]);
    setTeamMemberSearch('');
  };

  const handleToggleMember = (employeeId) => {
    setTeamMemberIds((current) => {
      if (current.includes(employeeId)) {
        return current.filter((entry) => entry !== employeeId);
      }
      return [...current, employeeId];
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }

    if (!managerId) {
      setError('Project manager is required.');
      return;
    }

    if (Number(form.progress) < 0 || Number(form.progress) > 100) {
      setError('Progress must be between 0 and 100.');
      return;
    }

    if (
      form.startDate &&
      form.deadline &&
      new Date(form.deadline) < new Date(form.startDate)
    ) {
      setError('Deadline cannot be before the start date.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        progress: Number(form.progress || 0),
        startDate: form.startDate || '',
        deadline: form.deadline || '',
        managerId,
        memberIds: teamMemberIds,
      };

      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, payload);
        setNotice('Project updated successfully.');
      } else {
        await api.post('/projects', payload);
        setNotice('Project created successfully.');
      }

      handleCloseModal();
      loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchiveProject) return;

    setIsArchiving(true);
    setError('');
    setNotice('');

    try {
      await api.patch(`/projects/${confirmArchiveProject.id}/archive`);
      setNotice('Project archived successfully.');
      setConfirmArchiveProject(null);
      loadProjects();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsArchiving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Project Name' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'progress', label: 'Progress' },
      { key: 'deadline', label: 'Deadline' },
      {
        key: 'actions',
        label: 'Actions',
        render: (project) => (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleEditProject(project)}
            >
              Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmArchiveProject(project)}
            >
              Archive
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
        title="Projects"
        subtitle="Track initiatives, deadlines, and progress."
        action={
          <button className="btn btn-primary" onClick={handleAddProject}>
            + Create Project
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

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <SearchBar
            placeholder="Search projects"
            value={search}
            onChange={setSearch}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select
            className="input"
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ padding: '1rem' }}>
          <p className="text-secondary">Loading projects…</p>
        </div>
      ) : null}

      {!isLoading && !error && !projects.length ? (
        <EmptyState
          title="No projects found"
          description="Create your first project to start tracking work."
        />
      ) : null}

      {!isLoading && !error && projects.length ? (
        <>
          <DataTable
            columns={columns}
            rows={projects}
            emptyMessage="No projects found."
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
        title={editingProject ? 'Edit Project' : 'Create Project'}
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
            style={{ minWidth: '80px' }}
          >
            {isSaving ? <span className="spinner spinner-sm" /> : 'Save'}
          </button>,
        ]}
      >
        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <input
            className="input"
            placeholder="Project Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <textarea
            className="input"
            placeholder="Description"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            style={{ minHeight: '90px' }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <select
              className="input"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="PLANNING">Planning</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              className="input"
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value })
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
          >
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Start Date
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                Target Deadline
              </label>
              <input
                className="input"
                style={{ width: '100%' }}
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm({ ...form, deadline: event.target.value })
                }
              />
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <label className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Project Manager
            </label>
            <select
              className="input"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
            >
              <option value="">Select a manager</option>
              {isEmployeeLoading ? (
                <option value="" disabled>
                  Loading employees…
                </option>
              ) : null}
              {!isEmployeeLoading && !employeeOptions.length ? (
                <option value="" disabled>
                  No active employees found
                </option>
              ) : null}
              {sortedEmployeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {getEmployeeDisplayName(employee)}
                  {employee.role === 'MANAGER' ? ' (Manager)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            <label className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Team Members ({teamMemberIds.length} selected)
            </label>
            <input
              className="input"
              placeholder="Search employee by name or employee ID"
              value={teamMemberSearch}
              onChange={(event) => setTeamMemberSearch(event.target.value)}
            />
            <div
              style={{
                display: 'grid',
                gap: '0.45rem',
                maxHeight: '170px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: '0.45rem',
                padding: '0.6rem',
              }}
            >
              {employeeError ? (
                <p className="text-secondary" style={{ margin: 0 }}>
                  {employeeError}
                </p>
              ) : null}
              {!employeeError && filteredEmployeeOptions.length
                ? filteredEmployeeOptions.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      className="btn btn-outline"
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        padding: '0.7rem 0.85rem',
                        height: 'auto',
                      }}
                      onClick={() => handleToggleMember(employee.id)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          width: '100%',
                        }}
                      >
                        <span
                          style={{
                            width: '2.2rem',
                            height: '2.2rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-primary-soft)',
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                          }}
                        >
                          {getEmployeeInitials(employee)}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '0.9rem', lineHeight: 1.2, color: 'var(--color-text)' }}>
                            {getEmployeeDisplayName(employee)}
                          </strong>
                          <div
                            className="text-secondary"
                            style={{ fontSize: '0.78rem', lineHeight: 1.2, opacity: 0.8 }}
                          >
                            {employee.position || employee.department?.name || employee.email}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                : null}
              {!employeeError && !filteredEmployeeOptions.length ? (
                <p className="text-secondary" style={{ margin: 0 }}>
                  No matching employees.
                </p>
              ) : null}
            </div>
            {teamMemberIds.length ? (
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}
              >
                {teamMemberIds.map((memberId) => {
                  const employee = sortedEmployeeOptions.find(
                    (option) => option.id === memberId,
                  );
                  if (!employee) return null;
                  return (
                    <button
                      key={memberId}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleToggleMember(memberId)}
                    >
                      {getEmployeeDisplayName(employee)} ×
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          {editingProject ? (
            <div
              className="card"
              style={{ padding: '0.8rem', display: 'grid', gap: '0.6rem' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Project Details</strong>
                <span className="text-secondary">
                  {teamMemberIds.length} member
                  {teamMemberIds.length === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <div>
                  <span className="text-secondary">Project Manager:</span>{' '}
                  {managerId
                    ? getEmployeeDisplayName(
                        sortedEmployeeOptions.find(
                          (employee) => employee.id === managerId,
                        ) || {},
                      )
                    : 'Not selected'}
                </div>
                <div>
                  <span className="text-secondary">Team Members:</span>{' '}
                  {teamMemberIds.length
                    ? teamMemberIds
                        .map((memberId) => {
                          const employee = sortedEmployeeOptions.find(
                            (option) => option.id === memberId,
                          );
                          return employee
                            ? getEmployeeDisplayName(employee)
                            : null;
                        })
                        .filter(Boolean)
                        .join(', ')
                    : 'No team members selected'}
                </div>
              </div>
              {teamMemberIds.length ? (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {teamMemberIds.map((memberId) => {
                    const employee = sortedEmployeeOptions.find(
                      (option) => option.id === memberId,
                    );
                    if (!employee) return null;
                    return (
                      <div
                        key={memberId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.45rem 0.55rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: '0.4rem',
                        }}
                      >
                        <span
                          style={{
                            width: '2.2rem',
                            height: '2.2rem',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--color-primary-soft)',
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                          }}
                        >
                          {getEmployeeInitials(employee)}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '0.9rem', lineHeight: 1.2, color: 'var(--color-text)' }}>
                            {getEmployeeDisplayName(employee)}
                          </strong>
                          <div
                            className="text-secondary"
                            style={{ fontSize: '0.78rem', lineHeight: 1.2, opacity: 0.8 }}
                          >
                            {employee.department?.name || 'No department'} •{' '}
                            {employee.position || 'No position'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmArchiveProject}
        title="Archive project"
        description={`Archive ${confirmArchiveProject?.name || 'this project'}?`}
        confirmLabel="Archive"
        danger={false}
        onCancel={() => setConfirmArchiveProject(null)}
        onConfirm={handleArchive}
      />
    </div>
  );
}
