// Placeholder pages — each will be built out in a later phase

function ComingSoon({ title, description, icon }) {
  return (
    <div className="coming-soon-page animate-fade-in">
      <div className="coming-soon-inner">
        <div className="coming-soon-icon">{icon}</div>
        <h2>{title}</h2>
        <p className="text-secondary">{description}</p>
        <span className="badge badge-primary mt-4">Under Construction</span>
      </div>
    </div>
  );
}

// ─── Phase 2 placeholders ─────────────────────────────────────────────────────

export function ChatPage() {
  return (
    <ComingSoon
      title="Chat"
      description="Team messaging and direct conversations coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      }
    />
  );
}

export function EmailPage() {
  return (
    <ComingSoon
      title="Email"
      description="Manage your inbox and compose emails coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <polyline points="22,4 12,13 2,4" />
        </svg>
      }
    />
  );
}

export function MeetingsPage() {
  return (
    <ComingSoon
      title="Meetings"
      description="Schedule and join video meetings coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
    />
  );
}

export function TasksPage() {
  return (
    <ComingSoon
      title="Tasks"
      description="Track and assign work items coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      }
    />
  );
}

export function ProjectsPage() {
  return (
    <ComingSoon
      title="Projects"
      description="Manage team projects and milestones coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      }
    />
  );
}

export function AttendancePage() {
  return (
    <ComingSoon
      title="Attendance"
      description="Log check-ins and view attendance history coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="9 16 11 18 15 14" />
        </svg>
      }
    />
  );
}

// ─── Phase 3C new placeholders ────────────────────────────────────────────────

export function NotificationsPage() {
  return (
    <ComingSoon
      title="Notifications"
      description="All your alerts and activity notifications in one place — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      }
    />
  );
}

export function FilesPage() {
  return (
    <ComingSoon
      title="File Manager"
      description="Upload, organise and share documents securely — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      }
    />
  );
}

export function DirectoryPage() {
  return (
    <ComingSoon
      title="Employee Directory"
      description="Browse and search all colleagues across departments — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      }
    />
  );
}

export function AnnouncementsPage() {
  return (
    <ComingSoon
      title="Announcements"
      description="Company-wide announcements and important updates — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      }
    />
  );
}

export function TimeTrackerPage() {
  return (
    <ComingSoon
      title="Time Tracker"
      description="Log your working hours and track project time — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      }
    />
  );
}

export function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Analytics and performance reports for your team — coming soon."
      icon={
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      }
    />
  );
}
