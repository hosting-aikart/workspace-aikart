import { useNotifications } from '../../context/NotificationContext';
import { getNotificationNavState } from '../../utils/notificationLinks';

const TYPE_ICON = {
  ANNOUNCEMENT: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  CHAT_MESSAGE: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  MEETING_INVITE: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  GROUP_INVITE: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  PROJECT_INVITE: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  TASK_ASSIGNED: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  SYSTEM: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

function formatRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function NotificationPanel({ onClose, onNavigate, viewAllPath }) {
  const { notifications, unreadCount, loading, markRead, markAllRead, clearAll } = useNotifications();

  const handleItemClick = (item) => {
    if (!item.isRead) markRead(item.id);
    onClose();
    if (item.link) onNavigate(item.link, getNotificationNavState(item));
  };

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <h4 className="notif-panel-title">
          Notifications {unreadCount > 0 && <span className="notif-panel-count">{unreadCount} new</span>}
        </h4>
        <div className="notif-panel-actions">
          {unreadCount > 0 && (
            <button className="btn-link text-sm" onClick={markAllRead}>Mark all read</button>
          )}
          {notifications.length > 0 && (
            <button className="btn-link text-sm" onClick={() => clearAll()}>Clear all</button>
          )}
        </div>
      </div>

      <div className="notif-panel-list">
        {loading ? (
          <div style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-text" style={{ width: `${50 + i * 12}%` }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-panel-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-secondary text-sm">You're all caught up.</p>
          </div>
        ) : (
          notifications.map((item) => (
            <button
              key={item.id}
              className={`notif-panel-item ${!item.isRead ? 'notif-panel-item-unread' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="notif-panel-item-icon">{TYPE_ICON[item.type] || TYPE_ICON.SYSTEM}</span>
              <span className="notif-panel-item-body">
                <span className="notif-panel-item-title">{item.title}</span>
                {item.body && <span className="notif-panel-item-desc">{item.body}</span>}
                <span className="notif-panel-item-time">{formatRelativeTime(item.createdAt)}</span>
              </span>
              {!item.isRead && <span className="notif-panel-item-dot" />}
            </button>
          ))
        )}
      </div>

      <div className="notif-panel-footer">
        <button
          className="btn-link text-sm"
          onClick={() => {
            onClose();
            onNavigate(viewAllPath);
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
