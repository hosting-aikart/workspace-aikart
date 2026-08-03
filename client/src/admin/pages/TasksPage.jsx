import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import api from '../../utils/api';

const columns = [
  { key: 'id', label: 'Task ID' },
  { key: 'title', label: 'Task' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  {
    key: 'project',
    label: 'Project',
    render: (row) => row.project?.name || '-',
  },
  {
    key: 'dueDate',
    label: 'Due Date',
    render: (row) =>
      row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-',
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (row) => <button className="btn btn-outline btn-sm">Open</button>,
  },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data } = await api.get('/tasks');
        setTasks(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        console.error('Failed to load tasks', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Coordinate work items across the workspace."
        action={
          <button
            className="btn btn-primary"
            onClick={() => navigate('/projects')}
          >
            + Create Task
          </button>
        }
      />
      {loading ? (
        <div className="py-8 text-sm text-gray-500">Loading tasks…</div>
      ) : (
        <DataTable
          columns={columns}
          rows={tasks}
          emptyMessage="No tasks found."
        />
      )}
    </div>
  );
}
