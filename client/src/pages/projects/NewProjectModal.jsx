import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export default function NewProjectModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1 = details, 2 = members
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    repositoryLink: '',
  });
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const primaryEndpoint = user?.role === 'ADMIN' ? '/admin/employees' : '/manager/team';
        let res;
        try {
          res = await api.get(primaryEndpoint, { params: { limit: 200 } });
        } catch (e) {
          res = await api.get('/manager/team');
        }
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : res?.data?.data?.employees || [];
        setAllUsers(list.filter((u) => u.isActive !== false));
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [user?.role]);

  const filteredUsers = allUsers.filter((u) => {
    if (selectedMembers.some((s) => s.id === u.id)) return false;
    if (!memberSearch.trim()) return true;
    const term = memberSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.position?.toLowerCase().includes(term)
    );
  });

  const toggleMember = (user) => {
    if (selectedMembers.some((s) => s.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((s) => s.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
    setMemberSearch('');
    searchRef.current?.focus();
  };

  const removeMember = (userId) => {
    setSelectedMembers(selectedMembers.filter((s) => s.id !== userId));
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        deadline: formData.deadline
          ? new Date(formData.deadline).toISOString()
          : undefined,
        repositoryLink: formData.repositoryLink || undefined,
      };

      const { data } = await api.post('/projects', payload);

      if (data?.success || data?.status === 'success') {
        const projectId = data.data?.id;

        // Add selected members to the project
        if (projectId && selectedMembers.length > 0) {
          await Promise.allSettled(
            selectedMembers.map((member) =>
              api.post(`/projects/${projectId}/members`, { userId: member.id })
            )
          );
        }

        onSuccess(data.data);
      } else {
        setError(data?.message || 'Failed to create project');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canGoStep2 = formData.name.trim().length > 0;

  /* ─── Styles ──────────────────────────────────────────────────────────── */
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(8px)',
  };

  const cardStyle = {
    background: 'var(--color-surface)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--color-border)',
  };

  const bodyStyle = {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--color-border)',
    gap: '0.75rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    marginBottom: '0.35rem',
    color: 'var(--color-text)',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              {step === 1 ? 'Create New Project' : 'Add Team Members'}
            </h2>
            <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
              Step {step} of 2
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Step progress bar */}
        <div style={{ height: '3px', background: 'var(--color-border)' }}>
          <div
            style={{
              height: '100%',
              width: step === 1 ? '50%' : '100%',
              background: 'var(--color-primary, #4461F2)',
              transition: 'width 0.3s ease',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1.5rem 0' }}>
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* Body */}
        <div style={bodyStyle}>
          {step === 1 && (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Project Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Website Redesign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                  placeholder="Briefly describe the project goals and scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Deadline</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Repository Link</label>
                  <input
                    type="url"
                    style={inputStyle}
                    placeholder="https://github.com/..."
                    value={formData.repositoryLink}
                    onChange={(e) => setFormData({ ...formData, repositoryLink: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              {/* Selected members chips */}
              {selectedMembers.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.45rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(68, 97, 242, 0.12)',
                        color: 'var(--color-primary, #4461F2)',
                        borderRadius: '20px',
                        padding: '0.3rem 0.45rem 0.3rem 0.35rem',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--color-primary, #4461F2)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {member.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                      <button
                        onClick={() => removeMember(member.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          lineHeight: 1,
                          padding: '0 0.15rem',
                          opacity: 0.7,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.9rem',
                  }}
                >
                  🔍
                </span>
                <input
                  ref={searchRef}
                  style={{ ...inputStyle, paddingLeft: '2.2rem' }}
                  placeholder="Search team members by name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Contact list */}
              <div
                style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                }}
              >
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u, idx) => {
                    const isSelected = selectedMembers.some((s) => s.id === u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleMember(u)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.8rem 0.95rem',
                          cursor: 'pointer',
                          transition: 'background 0.12s',
                          borderBottom:
                            idx < filteredUsers.length - 1
                              ? '1px solid var(--color-border)'
                              : 'none',
                          background: isSelected
                            ? 'rgba(68, 97, 242, 0.08)'
                            : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--color-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? 'rgba(68, 97, 242, 0.08)'
                            : 'transparent';
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
                          {u.name
                            ? u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                            : 'U'}
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

                        {/* Checkbox indicator */}
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: isSelected
                              ? 'none'
                              : '2px solid var(--color-border-strong, #555)',
                            background: isSelected
                              ? 'var(--color-primary, #4461F2)'
                              : 'transparent',
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
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {memberSearch
                      ? 'No matching employees found.'
                      : 'All employees have been selected.'}
                  </div>
                )}
              </div>

              <div
                className="text-secondary"
                style={{ marginTop: '0.6rem', fontSize: '0.78rem', textAlign: 'center' }}
              >
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {step === 1 ? (
            <>
              <button className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
              >
                Next — Add Members →
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{ minWidth: '140px' }}
              >
                {loading ? <span className="spinner spinner-sm" /> : `Create Project${selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
