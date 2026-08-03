import { useEffect, useState } from 'react';
import api from '../utils/api';
import PageHeader from '../admin/components/PageHeader';
import Badge from '../admin/components/Badge';
import NewTaskModal from '../modules/tasks/components/NewTaskModal';

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Failed to load team data.';

export default function TeamDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchTeamDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/manager/dashboard');
      setData(res?.data || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDashboard();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="text-secondary">Loading Team Dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '1.5rem', borderColor: 'var(--color-danger)' }}>
        <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>
      </div>
    );
  }

  const teamMembers = data?.teamMembers || [];
  const managedProjects = data?.managedProjects || [];
  const taskMetrics = data?.taskMetrics || { pending: 0, completed: 0, total: 0 };
  const todayAttendance = data?.todayAttendance || { totalTeam: 0, checkedIn: 0 };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Team Dashboard"
        subtitle="Overview of your managed team members, active projects, task progress, and attendance."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setIsTaskModalOpen(true)}
          >
            + Assign Task
          </button>
        }
      />

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Team Size
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0.2rem 0' }}>
            {data?.teamMembersCount || 0}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem' }}>
            Direct reports & project members
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Projects
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0.2rem 0' }}>
            {data?.managedProjectsCount || 0}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem' }}>
            Managed workspace projects
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Pending Tasks
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
            {taskMetrics.pending}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem' }}>
            {taskMetrics.completed} completed of {taskMetrics.total} total
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
            Today's Attendance
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0' }}>
            {todayAttendance.checkedIn} / {todayAttendance.totalTeam}
          </div>
          <p className="text-secondary" style={{ margin: 0, fontSize: '0.8rem' }}>
            Team members checked in today
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Managed Projects List */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Managed Projects</h3>
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{managedProjects.length} Projects</span>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {managedProjects.length > 0 ? (
              managedProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    padding: '1.1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{project.name}</h4>
                    <Badge tone={project.status === 'ACTIVE' ? 'primary' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-secondary" style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span className="text-secondary">Progress</span>
                      <strong style={{ color: 'var(--color-primary)' }}>{project.progress}%</strong>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${project.progress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #4461F2, #22c55e)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    <span>{project._count?.tasks || 0} Tasks</span>
                    <span>{project.members?.length || 0} Members</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-secondary">No managed projects assigned to you.</p>
            )}
          </div>
        </div>

        {/* Team Members List */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Team Roster</h3>
            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{teamMembers.length} Members</span>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(68, 97, 242, 0.15)',
                        color: '#4461F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                      }}
                    >
                      {member.name ? member.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{member.name}</strong>
                      <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {member.position || member.department?.name || member.role}
                      </span>
                    </div>
                  </div>
                  <Badge tone={member.role === 'ADMIN' ? 'danger' : member.role === 'MANAGER' ? 'warning' : 'primary'}>
                    {member.role}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-secondary">No team members reporting to you.</p>
            )}
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <NewTaskModal
          projects={managedProjects}
          users={teamMembers}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={() => {
            setIsTaskModalOpen(false);
            fetchTeamDashboard();
          }}
        />
      )}
    </div>
  );
}
