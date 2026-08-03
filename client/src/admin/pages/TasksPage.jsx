import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, TODO, IN_PROGRESS, DONE
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', {
        params: {
          priority: priorityFilter,
        },
      });
      setTasks(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error('Failed to load tasks', error);
    } finally {
      setLoading(false);
    }
  }, [priorityFilter]);

  const loadProjectsAndUsers = useCallback(async () => {
    try {
      const [{ data: projectsRes }, { data: usersRes }] = await Promise.all([
        api.get('/projects', { params: { limit: 100 } }),
        api.get('/admin/employees', { params: { limit: 100 } }),
      ]);

      const projectsData = projectsRes?.data;
      setProjects(
        Array.isArray(projectsData?.projects)
          ? projectsData.projects
          : Array.isArray(projectsData)
          ? projectsData
          : [],
      );

      const employeesData = usersRes?.data;
      setUsers(
        Array.isArray(employeesData?.employees)
          ? employeesData.employees
          : Array.isArray(employeesData)
          ? employeesData
          : [],
      );
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

  const handleStatusChange = async (taskId, nextStatus) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      );
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusTab !== 'ALL' && t.status !== statusTab) {
        return false;
      }
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.project?.name?.toLowerCase().includes(term)
      );
    });
  }, [tasks, statusTab, search]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED').length;
    return { total, todo, inProgress, done };
  }, [tasks]);

  const columns = [
    {
      key: 'title',
      label: 'Task Details',
      render: (row) => (
        <div>
          <strong style={{ fontSize: '0.95rem' }}>{row.title}</strong>
          {row.description && (
            <div className="text-secondary" style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.15rem' }}>
              {row.description.length > 70 ? row.description.slice(0, 70) + '…' : row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'project',
      label: 'Project',
      render: (row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          {row.project?.name || '—'}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <Badge tone={getPriorityTone(row.priority)}>{row.priority}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <select
          className="input"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
          value={row.status}
          onChange={(e) => handleStatusChange(row.id, e.target.value)}
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="ITERATE">Iterate</option>
        </select>
      ),
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Tasks Management"
        subtitle="Manage, assign, and track workspace task progress in real time."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Task
          </button>
        }
      />

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>TOTAL TASKS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{taskStats.total}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>TO DO</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)', margin: '0.2rem 0 0 0' }}>{taskStats.todo}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>IN PROGRESS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.2rem 0 0 0' }}>{taskStats.inProgress}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>DONE</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)', margin: '0.2rem 0 0 0' }}>{taskStats.done}</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          className={`btn ${statusTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusTab('ALL')}
        >
          All Tasks ({taskStats.total})
        </button>
        <button
          className={`btn ${statusTab === 'TODO' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusTab('TODO')}
        >
          To Do ({taskStats.todo})
        </button>
        <button
          className={`btn ${statusTab === 'IN_PROGRESS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusTab('IN_PROGRESS')}
        >
          In Progress ({taskStats.inProgress})
        </button>
        <button
          className={`btn ${statusTab === 'DONE' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusTab('DONE')}
        >
          Done ({taskStats.done})
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search task title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '240px' }}
          />
          <select
            className="input"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading task board…</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredTasks}
          emptyMessage="No tasks found matching current filters."
        />
      )}

      {/* Redesigned Glassmorphic New Task Modal */}
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
