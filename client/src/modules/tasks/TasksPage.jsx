import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NewTaskModal from './components/NewTaskModal';
import api from '../../utils/api';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Data for NewTaskModal
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/tasks'); // Defaults to assigned to current user
      setTasks(data.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/employees'); // Adjust based on your available endpoints
      setUsers(
        Array.isArray(data?.data) ? data.data : data?.data?.employees || [],
      );
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { data } = await api.patch(`/tasks/${taskId}`, {
        status: newStatus,
      });
      if (data?.success) {
        setTasks(
          tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
        );
      } else {
        alert(data?.message || 'Failed to update task status');
      }
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  const filteredTasks =
    filterStatus === 'ALL'
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);

  const getPriorityBadge = (priority) => {
    const colors = {
      URGENT: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
      LOW: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return (
      <span
        className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${colors[priority] || colors.LOW}`}
      >
        {priority}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 mt-1">
            Manage your assigned tasks and track progress
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Task
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-shrink-0">
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex-1 text-center py-12 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No tasks found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You have no tasks matching this filter.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-900 w-1/3">
                  Task
                </th>
                <th className="p-4 text-sm font-semibold text-gray-900">
                  Project
                </th>
                <th className="p-4 text-sm font-semibold text-gray-900">
                  Priority
                </th>
                <th className="p-4 text-sm font-semibold text-gray-900">
                  Due Date
                </th>
                <th className="p-4 text-sm font-semibold text-gray-900">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                >
                  <td className="p-4">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {task.project ? task.project.name : '-'}
                  </td>
                  <td className="p-4">{getPriorityBadge(task.priority)}</td>
                  <td className="p-4 text-sm text-gray-600">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-4">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value)
                      }
                      className={`text-xs font-semibold rounded-lg border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white cursor-pointer pr-8 bg-no-repeat ${
                        task.status === 'COMPLETED'
                          ? 'text-green-700 border-green-200 bg-green-50'
                          : task.status === 'IN_PROGRESS'
                            ? 'text-blue-700 border-blue-200 bg-blue-50'
                            : 'text-gray-700 border-gray-300'
                      }`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                        backgroundPosition: 'right 0.7rem top 50%',
                        backgroundSize: '0.65rem auto',
                      }}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <NewTaskModal
          projects={projects}
          users={users}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchTasks(); // Refresh tasks
          }}
        />
      )}
    </div>
  );
}
