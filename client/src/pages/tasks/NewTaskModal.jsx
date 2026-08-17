import { useState } from 'react';
import api from '../../utils/api';

export default function NewTaskModal({
  onClose,
  onSuccess,
  projects = [],
  users = [],
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedToId: '',
    priority: 'MEDIUM',
    dueDate: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Task title is required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        projectId: formData.projectId || null,
        assignedToId: formData.assignedToId || null,
        priority: formData.priority,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      const { data } = await api.post('/tasks', payload);
      if (data?.status === 'success' || data?.success) {
        onSuccess(data.data);
      } else {
        setError(data?.message || 'Failed to create task');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          background: 'var(--color-surface, #1e293b)',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
              Create New Task
            </h2>
            <p className="text-secondary" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              Assign work items to team members and track progress.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Task Title <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
            </label>
            <input
              type="text"
              required
              className="input"
              style={{ width: '100%' }}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Implement user dashboard widgets"
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
              Description
            </label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: '90px', resize: 'vertical' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details, acceptance criteria, or links..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Project
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              >
                <option value="">No Project Assigned</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Assignee
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Priority
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                Due Date
              </label>
              <input
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating Task…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
