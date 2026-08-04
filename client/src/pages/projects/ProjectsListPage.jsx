import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NewProjectModal from './NewProjectModal';
import api from '../../utils/api';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';

export default function ProjectsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/projects');
      const payload = data?.data;
      setProjects(Array.isArray(payload) ? payload : payload?.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    });
  }, [projects, statusFilter, search]);

  const statusCounts = useMemo(
    () => ({
      all: projects.length,
      PLANNING: projects.filter((p) => p.status === 'PLANNING').length,
      ACTIVE: projects.filter((p) => p.status === 'ACTIVE').length,
      ON_HOLD: projects.filter((p) => p.status === 'ON_HOLD').length,
      COMPLETED: projects.filter((p) => p.status === 'COMPLETED').length,
    }),
    [projects]
  );

  const getStatusTone = (status) => {
    switch (status) {
      case 'PLANNING': return 'primary';
      case 'ACTIVE': return 'success';
      case 'ON_HOLD': return 'warning';
      case 'COMPLETED': return 'secondary';
      case 'CANCELLED': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PLANNING': return '#4461F2';
      case 'ACTIVE': return '#22c55e';
      case 'ON_HOLD': return '#f59e0b';
      case 'COMPLETED': return '#6b7280';
      case 'CANCELLED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return '#22c55e';
    if (progress >= 40) return '#4461F2';
    if (progress >= 10) return '#f59e0b';
    return 'var(--color-border-strong, #555)';
  };

  const tableColumns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (p) => (
        <div>
          <strong style={{ fontSize: '0.92rem', cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
            {p.name}
          </strong>
          <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
            {p.description ? p.description.slice(0, 50) + (p.description.length > 50 ? '...' : '') : 'No description'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <Badge tone={getStatusTone(p.status)}>{p.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px' }}>
          <div style={{ flex: 1, height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${p.progress || 0}%`, height: '100%', background: getProgressColor(p.progress || 0) }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: getProgressColor(p.progress || 0) }}>
            {p.progress || 0}%
          </span>
        </div>
      ),
    },
    {
      key: 'members',
      label: 'Team Size',
      render: (p) => `${p._count?.members || 0} members`,
    },
    {
      key: 'tasks',
      label: 'Tasks',
      render: (p) => `${p._count?.tasks || 0} tasks`,
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (p) => (p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => (
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/projects/${p.id}`)}>
          View Board
        </button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Project Management"
        subtitle="Track, organize, and create projects across your team and workspace."
        action={
          user?.role === 'ADMIN' && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Create New Project
            </button>
          )
        }
      />

      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>TOTAL PROJECTS</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{projects.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>ACTIVE PROJECTS</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0 0 0' }}>{statusCounts.ACTIVE}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>IN PLANNING</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4461F2', margin: '0.2rem 0 0 0' }}>{statusCounts.PLANNING}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.78rem', fontWeight: 600 }}>COMPLETED</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6b7280', margin: '0.2rem 0 0 0' }}>{statusCounts.COMPLETED}</div>
        </div>
      </div>

      {/* Filters Toolbar + View Switcher */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flex: 1, flexWrap: 'wrap' }}>
            {[
              { key: '', label: 'All', count: statusCounts.all },
              { key: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
              { key: 'PLANNING', label: 'Planning', count: statusCounts.PLANNING },
              { key: 'ON_HOLD', label: 'On Hold', count: statusCounts.ON_HOLD },
              { key: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`btn btn-sm ${statusFilter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatusFilter(tab.key)}
                style={{ fontSize: '0.82rem' }}
              >
                {tab.label}
                <span style={{ marginLeft: '0.3rem', opacity: 0.7, fontSize: '0.75rem' }}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '200px' }}
            />

            {/* View Mode Toggle Buttons */}
            <div style={{ display: 'flex', background: 'var(--color-bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                title="Grid view"
              >
                ⊞ Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                title="Table view"
              >
                ≡ Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton-box" style={{ width: '60%', height: '20px' }} />
                <div className="skeleton-box" style={{ width: '25%', height: '20px', borderRadius: '12px' }} />
              </div>
              <div className="skeleton-box" style={{ width: '90%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '6px', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.4 }}>📁</div>
          <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem' }}>No projects found</h3>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
            {search || statusFilter
              ? 'Try adjusting your filters or search query.'
              : 'Get started by creating your first project.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <DataTable columns={tableColumns} rows={filteredProjects} emptyMessage="No projects found." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredProjects.map((project) => {
            const memberCount = project._count?.members || 0;
            const taskCount = project._count?.tasks || 0;
            const progress = project.progress || 0;
            const progressColor = getProgressColor(progress);
            const statusColor = getStatusColor(project.status);

            return (
              <div
                key={project.id}
                className="card animate-fade-in"
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Color accent stripe */}
                <div style={{ height: '4px', background: statusColor }} />

                <div style={{ padding: '1.25rem' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        marginRight: '0.5rem',
                      }}
                    >
                      {project.name}
                    </h3>
                    <Badge tone={getStatusTone(project.status)}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p
                    className="text-secondary"
                    style={{
                      margin: '0 0 1rem 0',
                      fontSize: '0.83rem',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.35rem',
                    }}
                  >
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        marginBottom: '0.3rem',
                      }}
                    >
                      <span className="text-secondary">Progress</span>
                      <strong style={{ color: progressColor }}>{progress}%</strong>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: 'var(--color-border)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progressColor,
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer meta */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        <span className="text-secondary">{memberCount}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span className="text-secondary">{taskCount} tasks</span>
                      </div>
                    </div>

                    {project.deadline && (
                      <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        Due {new Date(project.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <NewProjectModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}
