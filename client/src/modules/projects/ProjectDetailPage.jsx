import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For adding members
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/projects/${id}`);
      setProject(data?.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/employees'); // Assuming there's an endpoint to get users
      setUsers(
        Array.isArray(data?.data) ? data.data : data?.data?.employees || [],
      );
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    try {
      const { data } = await api.patch(`/projects/${id}`, {
        status: newStatus,
      });
      if (data?.success) setProject({ ...project, status: newStatus });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setAddingMember(true);
    try {
      const { data } = await api.post(`/projects/${id}/members`, {
        userId: selectedUserId,
      });
      if (data?.success) {
        fetchProject();
        setSelectedUserId('');
      } else {
        alert(data?.message || 'Failed to add member');
      }
    } catch (err) {
      alert('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      if (data?.success) fetchProject();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || 'Project not found'}
        </div>
      </div>
    );
  }

  const canEdit =
    project.createdById === user?.id ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Project Details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
              {canEdit ? (
                <select
                  value={project.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {project.status.replace('_', ' ')}
                </span>
              )}
            </div>

            <p className="text-gray-600 whitespace-pre-wrap mb-6">
              {project.description || 'No description provided.'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-gray-500">
                  Deadline
                </span>
                <span className="block text-sm text-gray-900">
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString()
                    : 'No deadline'}
                </span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-500">
                  Repository
                </span>
                <span className="block text-sm text-gray-900">
                  {project.repositoryLink ? (
                    <a
                      href={project.repositoryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {project.repositoryLink}
                    </a>
                  ) : (
                    'None'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Project Tasks
              </h2>
            </div>
            {project.tasks?.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                No tasks assigned to this project yet.
              </p>
            ) : (
              <div className="space-y-3">
                {project.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            task.priority === 'URGENT'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'HIGH'
                                ? 'bg-orange-100 text-orange-700'
                                : task.priority === 'MEDIUM'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Members & Progress */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Progress
            </h2>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Completion</span>
              <span className="font-medium text-gray-900">
                {project.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Team Members
            </h2>

            {canEdit && (
              <div className="flex gap-2 mb-4">
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !selectedUserId}
                  className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            <div className="space-y-3">
              {project.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3">
                    {member.user.profilePhoto ? (
                      <img
                        src={member.user.profilePhoto}
                        alt={member.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {member.user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  {canEdit && member.userId !== project.createdById && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-red-500 hover:text-red-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove member"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
