import { useAuth } from '../context/AuthContext';

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
function CalCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 16 11 18 15 14" />
    </svg>
  );
}

// ─── DashboardCard ────────────────────────────────────────────────────────────

function DashboardCard({ icon, title, color, badge, children }) {
  return (
    <div className="dash-card card">
      <div className="card-body">
        <div className="dash-card-header">
          <div className="dash-card-icon" style={{ background: color + '18', color }}>
            {icon}
          </div>
          <h4 className="dash-card-title">{title}</h4>
          {badge && <span className="badge badge-neutral dash-card-badge">{badge}</span>}
        </div>
        <div className="dash-card-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div className="dash-empty">
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

  const now      = new Date();
  const hour     = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="home-page animate-fade-in">

      {/* ── Welcome Hero ───────────────────────────────────────────────── */}
      <div className="home-hero">
        <div>
          <h1 className="home-greeting">
            {greeting}, <span className="text-primary">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-secondary mt-1">
            Here's your workspace overview for today.
          </p>
        </div>
        <div className="home-date">
          <p className="home-date-day">
            {now.toLocaleDateString('en-IN', { weekday: 'long' })}
          </p>
          <p className="home-date-full">
            {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── 6 Dashboard Cards ─────────────────────────────────────────── */}
      <div className="dash-cards-grid">

        <DashboardCard
          icon={<TaskIcon />}
          title="Today's Tasks"
          color="#4461F2"
          badge="0 open"
        >
          <EmptyState label="No tasks assigned for today. Tasks module coming soon." />
        </DashboardCard>

        <DashboardCard
          icon={<ProjectIcon />}
          title="Active Projects"
          color="#8B5CF6"
          badge="0 active"
        >
          <EmptyState label="You haven't been added to any projects yet." />
        </DashboardCard>

        <DashboardCard
          icon={<MeetingIcon />}
          title="Upcoming Meetings"
          color="#10B981"
          badge="0 today"
        >
          <EmptyState label="No meetings scheduled. Meetings module coming soon." />
        </DashboardCard>

        <DashboardCard
          icon={<BellIcon />}
          title="Notifications"
          color="#F59E0B"
        >
          <EmptyState label="You're all caught up! No new notifications." />
        </DashboardCard>

        <DashboardCard
          icon={<ClockIcon />}
          title="Working Hours Today"
          color="#06B6D4"
        >
          <div className="dash-stat-display">
            <span className="dash-stat-big">0h 0m</span>
            <span className="text-secondary text-xs">Time Tracker module coming soon</span>
          </div>
        </DashboardCard>

        <DashboardCard
          icon={<CalCheckIcon />}
          title="Attendance Status"
          color="#EF4444"
        >
          <div className="dash-stat-display">
            <span className="dash-status-chip dash-status-absent">Not Checked In</span>
            <span className="text-secondary text-xs">Attendance module coming soon</span>
          </div>
        </DashboardCard>

      </div>

    </div>
  );
}
