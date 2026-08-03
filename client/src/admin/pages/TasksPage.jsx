import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import api from '../../utils/api';
import NewTaskModal from '../../modules/tasks/components/NewTaskModal';

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
    case 'DONE':
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'TODO':
    case 'PENDING':
      return 'warning';
    default:
      return 'secondary';
  }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', {
        params: {
          status: statusFilter,
          priority: priorityFilter,
        },
      });
      setTasks(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error('Failed to load tasks', error);
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, statusFilter]);

  const loadProjectsAndUsers = useCallback(async () => {
    try {
      const [{ data: projectsRes }, { data: usersRes }] = await Promise.all([
        api.get('/projects', { params: { limit: 100 } }),
        api.get('/admin/employees', { params: { limit: 100 } }),
      ]);

      const projectsData = projectsRes?.data;
      setProjects(Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : []);

      const employeesData = usersRes?.data;
      setUsers(Array.isArray(employeesData?.employees) ? employeesData.employees : Array.isArray(employeesData) ? employeesData : []);
    } catch (err) {
      console.error('Failed to load modal reference data', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadProjectsAndUsers();
  }, [loadProjectsAndUsers]);

  const columns = [
    {
      key: 'title',
      label: 'Task',
      render: (row) => (
        <div>
          <strong style={{ fontSize: '0.95rem' }}>{row.title}</strong>
          {row.description && (
            <div className="text-secondary" style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              {row.description.length > 60 ? row.description.slice(0, 60) + '…' : row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'project',
      label: 'Project',
      render: (row) => row.project?.name || '—',
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <Badge tone={getPriorityTone(row.priority)}>{row.priority}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge tone={getStatusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row) =>
        row.dueDate
          ? new Date(row.dueDate).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })
          : '—',
    },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      t.title?.toLowerCase().includes(term) ||
      t.description?.toLowerCase().includes(term) ||
      t.project?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <PageHeader
        title="Tasks Management"
        subtitle="Manage, assign, and track work items across projects."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Task
          </button>
        }
      />

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '220px' }}
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
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="ITERATE">Iterate</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading tasks…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredTasks}
          emptyMessage="No tasks found."
        />
      )}

      {/* New Task Modal */}
      {isModalOpen && (
        <NewTaskModal
          projects={projects}
          users={users}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadTasks();
          }}
        />
      )}
    </div>
  );
}
