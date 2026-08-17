import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { getNotificationNavState } from '../../utils/notificationLinks';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';

const TYPE_LABEL = {
  ANNOUNCEMENT: 'Announcement',
  CHAT_MESSAGE: 'Message',
  MEETING_INVITE: 'Meeting',
  GROUP_INVITE: 'Group',
  PROJECT_INVITE: 'Project',
  TASK_ASSIGNED: 'Task',
  SYSTEM: 'System',
};

const TYPE_TONE = {
  ANNOUNCEMENT: { background: '#3b82f6', color: '#fff' },
  CHAT_MESSAGE: { background: '#22c55e', color: '#fff' },
  MEETING_INVITE: { background: '#f59e0b', color: '#fff' },
  GROUP_INVITE: { background: '#8b5cf6', color: '#fff' },
  PROJECT_INVITE: { background: '#0ea5e9', color: '#fff' },
  TASK_ASSIGNED: { background: '#14b8a6', color: '#fff' },
  SYSTEM: { background: '#64748b', color: '#fff' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    clearOne,
    clearAll,
  } = useNotifications();
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD

  const filteredNotifications = useMemo(() => {
    if (filter === 'UNREAD') return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleCardClick = (item) => {
    if (!item.isRead) markRead(item.id);
    if (item.link) {
      const state = getNotificationNavState(item);
      navigate(item.link, state ? { state } : undefined);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '2rem' }}>
      <PageHeader
        title="Notifications"
        subtitle="Your personal activity feed — announcements, messages, and invites addressed to you."
        action={
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {unreadCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => clearAll()}>
                Clear all
              </button>
            )}
          </div>
        }
      />

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          background: 'var(--color-surface)',
          padding: '0.3rem',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          width: 'fit-content',
          marginBottom: '1.5rem',
        }}
      >
        <button
          className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('ALL')}
        >
          All ({notifications.length})
        </button>
        <button
          className={`btn btn-sm ${filter === 'UNREAD' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilter('UNREAD')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <div className="skeleton skeleton-text" style={{ width: '30%', marginBottom: '0.6rem' }} />
              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title={filter === 'UNREAD' ? "You're all caught up" : 'No notifications yet'}
          description={
            filter === 'UNREAD'
              ? 'You have read all your notifications.'
              : "You'll see announcements addressed to you, direct messages, and meeting invites here."
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredNotifications.map((item) => {
            const tone = TYPE_TONE[item.type] || TYPE_TONE.SYSTEM;
            const formattedTime = new Date(item.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={item.id}
                className="card animate-fade-in"
                onClick={() => handleCardClick(item)}
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  borderLeft: item.isRead ? '4px solid transparent' : '4px solid var(--color-primary)',
                  backgroundColor: item.isRead ? 'var(--color-surface)' : 'var(--color-primary-light)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        ...tone,
                      }}
                    >
                      {TYPE_LABEL[item.type] || 'System'}
                    </span>
                    {!item.isRead && (
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                        }}
                      >
                        • New
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {formattedTime}
                    </span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      aria-label="Clear notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearOne(item.id);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: item.isRead ? 600 : 700 }}>
                  {item.title}
                </h3>

                {item.body && (
                  <p className="text-secondary" style={{ margin: 0, lineHeight: 1.55, fontSize: '0.92rem' }}>
                    {item.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
