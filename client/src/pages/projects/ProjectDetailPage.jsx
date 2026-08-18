import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import TaskBoard from './TaskBoard';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Users for adding members
  const [allUsers, setAllUsers] = useState([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
  const searchRef = useRef(null);

  // Task modal state
  const [taskForm, setTaskForm] = useState({
    id: null,
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  const fetchProject = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data } = await api.get(`/projects/${id}`);
      setProject(data?.data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const primaryEndpoint = user?.role === 'ADMIN' ? '/admin/employees' : '/manager/team';
      let res;
      try {
        res = await api.get(primaryEndpoint, { params: { limit: 200 } });
      } catch (e) {
        res = await api.get('/manager/team');
      }
      const data = res?.data;
      setAllUsers(
        Array.isArray(data?.data) ? data.data : data?.data?.employees || []
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

  const handleBulkAddMembers = async () => {
    if (selectedMembers.length === 0) return;
    setAddingMembers(true);
    try {
      await Promise.allSettled(
        selectedMembers.map((m) =>
          api.post(`/projects/${id}/members`, { userId: m.id })
        )
      );
      await fetchProject(false);
      setIsAddMemberOpen(false);
      setSelectedMembers([]);
      setMemberSearch('');
    } catch (err) {
      alert('Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      if (data?.success) fetchProject(false);
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const openTaskModal = (task = null, status = 'TODO') => {
    if (task) {
      setTaskForm({
        id: task.id,
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        status: task.status || status,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      });
    } else {
      setTaskForm({
        id: null,
        title: '',
        description: '',
        priority: 'MEDIUM',
        status,
        dueDate: '',
      });
    }
    setTaskError('');
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    setTaskSubmitting(true);
    setTaskError('');

    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || null,
        priority: taskForm.priority,
        status: taskForm.status,
        dueDate: taskForm.dueDate
          ? new Date(taskForm.dueDate).toISOString()
          : null,
      };

      if (taskForm.id) {
        await api.patch(`/tasks/${taskForm.id}`, payload);
      } else {
        await api.post(`/projects/${id}/tasks`, payload);
      }

      setShowTaskModal(false);
      await fetchProject(false);
    } catch (err) {
      setTaskError(
        err?.response?.data?.message || err.message || 'Failed to save task'
      );
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      fetchProject(false);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleMoveTask = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      fetchProject(false);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to move task');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <p className="text-secondary">Loading project details…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '1rem', borderColor: 'var(--color-danger)' }}>
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const canEdit =
    project.createdById === user?.id ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER';

  const existingMemberIds = new Set(project.members?.map((m) => m.userId) || []);
  const availableUsersToSelect = allUsers.filter(
    (u) => !existingMemberIds.has(u.id) && !selectedMembers.some((s) => s.id === u.id)
  );

  const filteredUsers = availableUsersToSelect.filter((u) => {
    if (!memberSearch.trim()) return true;
    const term = memberSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.position?.toLowerCase().includes(term)
    );
  });

  const toggleMemberSelection = (u) => {
    if (selectedMembers.some((s) => s.id === u.id)) {
      setSelectedMembers(selectedMembers.filter((s) => s.id !== u.id));
    } else {
      setSelectedMembers([...selectedMembers, u]);
    }
    setMemberSearch('');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/projects')}
          style={{ padding: '0.4rem 0.75rem' }}
        >
          ← Back to Projects
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{project.name}</h1>
            {canEdit ? (
              <select
                value={project.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="input"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            ) : (
              <span className="badge badge-primary">{project.status}</span>
            )}
          </div>
        </div>
      </div>

      <div className="project-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* Main Left Column: Overview & Tasks */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Overview Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Project Overview</h3>
            <p className="text-secondary" style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {project.description || 'No description provided for this project.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', fontSize: '0.88rem' }}>
              <div>
                <span className="text-secondary" style={{ display: 'block', marginBottom: '0.2rem' }}>Deadline</span>
                <strong>
                  {project.deadline
                    ? new Date(project.deadline).toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : 'No deadline set'}
                </strong>
              </div>
              <div>
                <span className="text-secondary" style={{ display: 'block', marginBottom: '0.2rem' }}>Repository</span>
                {project.repositoryLink ? (
                  <a
                    href={project.repositoryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {project.repositoryLink} ↗
                  </a>
                ) : (
                  <strong>None</strong>
                )}
              </div>
            </div>
          </div>

          {/* Kanban / Tasks Board Section */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Tasks Board</h3>
              {canEdit && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openTaskModal(null, 'TODO')}
                >
                  + New Task
                </button>
              )}
            </div>

            <TaskBoard
              tasks={project.tasks || []}
              canManage={canEdit}
              onMoveTask={handleMoveTask}
              onCreateTask={(status) => openTaskModal(null, status)}
              onEditTask={(task) => openTaskModal(task)}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </div>

        {/* Right Sidebar: Progress & Members */}
        <div style={{ display: 'grid', gap: '1.5rem', alignContent: 'start' }}>
          {/* Progress Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 700 }}>Overall Completion</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <span className="text-secondary">Progress Rate</span>
              <strong style={{ color: 'var(--color-primary)' }}>{project.progress || 0}%</strong>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${project.progress || 0}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Team Members Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Team Members ({project.members?.length || 0})
              </h4>
              {canEdit && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setIsAddMemberOpen(true);
                    setSelectedMembers([]);
                    setMemberSearch('');
                  }}
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.55rem' }}
                >
                  + Add Member
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {project.members?.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(68, 97, 242, 0.15)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        flexShrink: 0,
                      }}
                    >
                      {member.user?.name
                        ? member.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                        : 'M'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <strong style={{ fontSize: '0.85rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.user?.name}
                      </strong>
                      <span className="text-secondary" style={{ fontSize: '0.75rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.user?.email}
                      </span>
                    </div>
                  </div>

                  {canEdit && member.userId !== project.createdById && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-danger, #ef4444)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        opacity: 0.7,
                        padding: '0.2rem',
                      }}
                      title="Remove member from project"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Style Add Member Modal */}
      {isAddMemberOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsAddMemberOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add Members to {project.name}</h3>
                <span className="text-secondary" style={{ fontSize: '0.78rem' }}>Select employees from workspace</span>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Selected Chips */}
            <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}>
              {selectedMembers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  {selectedMembers.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(68, 97, 242, 0.12)',
                        color: 'var(--color-primary)',
                        borderRadius: '20px',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      <span>{m.name}</span>
                      <button
                        onClick={() => toggleMemberSelection(m)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
                <input
                  ref={searchRef}
                  className="input"
                  style={{ width: '100%', paddingLeft: '2.2rem' }}
                  placeholder="Search team by name or position..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Employee contact list */}
              <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const isSelected = selectedMembers.some((s) => s.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleMemberSelection(u)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--color-border)',
                          background: isSelected ? 'rgba(68, 97, 242, 0.08)' : 'transparent',
                        }}
                      >
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isSelected
                              ? 'var(--color-primary, #4461F2)'
                              : 'rgba(68, 97, 242, 0.15)',
                            color: isSelected ? '#ffffff' : 'var(--color-primary, #4461F2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {u.name ? u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                            <strong
                              style={{
                                fontSize: '0.9rem',
                                color: 'var(--color-text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {u.name}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '12px',
                                background:
                                  u.role === 'ADMIN'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : u.role === 'MANAGER'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(68, 97, 242, 0.12)',
                                color:
                                  u.role === 'ADMIN'
                                    ? '#ef4444'
                                    : u.role === 'MANAGER'
                                    ? '#f59e0b'
                                    : 'var(--color-primary, #4461F2)',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {u.position || u.role}
                            </span>
                          </div>
                          <div
                            className="text-secondary"
                            style={{
                              fontSize: '0.78rem',
                              opacity: 0.75,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {u.email}
                          </div>
                        </div>

                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isSelected ? 'none' : '2px solid var(--color-border-strong, #ccc)',
                            background: isSelected ? 'var(--color-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                    {memberSearch ? 'No matching team members found.' : 'All available workspace users are already in this project.'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-outline" onClick={() => setIsAddMemberOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBulkAddMembers}
                disabled={addingMembers || selectedMembers.length === 0}
                style={{ minWidth: '120px' }}
              >
                {addingMembers ? <span className="spinner spinner-sm" /> : `Add ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit/Create Modal */}
      {showTaskModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setShowTaskModal(false)}
        >
          <div
            className="card animate-fade-in"
            style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {taskForm.id ? 'Edit Task' : 'Create Project Task'}
              </h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {taskError && (
              <div className="card" style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem', borderColor: 'var(--color-danger)' }}>
                <p style={{ margin: 0, color: 'var(--color-danger)', fontSize: '0.85rem' }}>{taskError}</p>
              </div>
            )}

            <form onSubmit={handleTaskSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Task Title *</label>
                <input
                  required
                  className="input"
                  style={{ width: '100%' }}
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Description</label>
                <textarea
                  className="input"
                  style={{ width: '100%', minHeight: '80px' }}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Priority</label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Status</label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="ITERATE">Iterate</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Due Date</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={taskSubmitting} style={{ minWidth: '110px' }}>
                  {taskSubmitting ? <span className="spinner spinner-sm" /> : taskForm.id ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
