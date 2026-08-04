import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

// ─── Empty-state icons ────────────────────────────────────────────────────────

function TaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function ProjectIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
function MeetingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── DashboardCard ────────────────────────────────────────────────────────────

function DashboardCard({ icon, title, color, badge, children }) {
  return (
    <div className="dash-card card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="dash-card-header">
          <div className="dash-card-icon" style={{ background: color + '18', color }}>
            {icon}
          </div>
          <h4 className="dash-card-title">{title}</h4>
          {badge !== undefined && <span className="badge badge-neutral dash-card-badge">{badge}</span>}
        </div>
        <div className="dash-card-body" style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div className="dash-empty" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3">
        <rect x="2" y="2" width="20" height="20" rx="4" />
        <line x1="8" y1="12" x2="16" y2="12" /><line x1="12" y1="8" x2="12" y2="16" />
      </svg>
      <p className="text-secondary text-sm">{label}</p>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, tasksRes, projRes, meetRes, annRes] = await Promise.all([
          api.get('/attendance/today').catch(() => ({ data: { data: null } })),
          api.get('/tasks?limit=5').catch(() => ({ data: { data: { tasks: [] } } })),
          api.get('/projects?limit=5').catch(() => ({ data: { data: [] } })),
          api.get('/meetings?limit=5').catch(() => ({ data: { data: [] } })),
          api.get('/announcements?limit=5').catch(() => ({ data: { data: [] } })),
        ]);
        
        setAttendance(attRes.data?.data);
        setTasks(tasksRes.data?.data?.tasks || tasksRes.data?.data || []);
        setProjects(projRes.data?.data?.projects || projRes.data?.data || []);
        setMeetings(meetRes.data?.data?.meetings || (Array.isArray(meetRes.data?.data) ? meetRes.data?.data : []));
        setAnnouncements(annRes.data?.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="home-page animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="home-header" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-secondary" style={{ fontSize: '1.1rem' }}>Here is what's happening in your workspace today.</p>
      </header>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <Link to="/app/attendance" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>⏱️ Start Attendance</Link>
        <Link to="/app/tasks" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>📝 Open Tasks</Link>
        <Link to="/app/projects" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>📁 View Projects</Link>
        <Link to="/app/meetings" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>📅 Join Meeting</Link>
        <Link to="/app/announcements" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600 }}>📣 Announcements</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', gridAutoRows: 'minmax(200px, auto)' }}>
        
        {/* Working Hours & Attendance */}
        <DashboardCard icon={<ClockIcon />} title="Attendance" color="#3B82F6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Today's Working Hours</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--text-primary)' }}>
                {formatDuration(attendance?.totalSeconds || 0)}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</p>
              <span className={`badge ${attendance?.status === 'WORKING' ? 'badge-success' : 'badge-neutral'}`} style={{ marginTop: '0.5rem', display: 'inline-block', fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                {attendance?.status?.replace('_', ' ') || 'Not Started'}
              </span>
            </div>
          </div>
        </DashboardCard>

        {/* Assigned Tasks */}
        <DashboardCard icon={<TaskIcon />} title="Assigned Tasks" color="#10B981" badge={tasks.length}>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <div className="skeleton-box" style={{ width: '80%', height: '16px' }} />
              <div className="skeleton-box" style={{ width: '60%', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
            </div>
          ) : tasks.length === 0 ? <EmptyState label="No assigned tasks" /> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.slice(0, 3).map(task => (
                <li key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border, #E5E7EB)' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--color-text, #1F2937)', marginBottom: '0.25rem' }}>{task.title}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)' }}>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                  </div>
                  <span className={`badge ${task.status === 'COMPLETED' ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '0.75rem' }}>{task.status?.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Current Projects */}
        <DashboardCard icon={<ProjectIcon />} title="Current Projects" color="#8B5CF6" badge={projects.length}>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <div className="skeleton-box" style={{ width: '75%', height: '16px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '8px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '60%', height: '14px' }} />
            </div>
          ) : projects.length === 0 ? <EmptyState label="No active projects" /> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {projects.slice(0, 3).map(proj => (
                <li key={proj.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border, #E5E7EB)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-text, #1F2937)' }}>{proj.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)', fontWeight: 600 }}>{proj.progress || 0}%</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'var(--color-bg, #F5F5F7)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${proj.progress || 0}%`, backgroundColor: '#8B5CF6', height: '100%', borderRadius: '4px' }}></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Upcoming Meetings */}
        <DashboardCard icon={<MeetingIcon />} title="Upcoming Meetings" color="#F59E0B" badge={meetings.length}>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <div className="skeleton-box" style={{ width: '70%', height: '16px' }} />
              <div className="skeleton-box" style={{ width: '50%', height: '14px' }} />
            </div>
          ) : meetings.length === 0 ? <EmptyState label="No upcoming meetings" /> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {meetings.slice(0, 3).map(meet => (
                <li key={meet.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border, #E5E7EB)' }}>
                  <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--color-text, #1F2937)', marginBottom: '0.25rem' }}>{meet.title}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)' }}>{new Date(meet.startTime).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Announcements */}
        <DashboardCard icon={<BellIcon />} title="Latest Announcements" color="#EF4444" badge={announcements.length}>
          {loading ? (
            <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <div className="skeleton-box" style={{ width: '85%', height: '16px' }} />
              <div className="skeleton-box" style={{ width: '40%', height: '14px' }} />
            </div>
          ) : announcements.length === 0 ? <EmptyState label="No recent announcements" /> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.slice(0, 3).map(ann => (
                <li key={ann.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border, #E5E7EB)' }}>
                  <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--color-text, #1F2937)', marginBottom: '0.25rem' }}>{ann.title}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #6B7280)' }}>{new Date(ann.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
