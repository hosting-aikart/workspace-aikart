import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const getPriorityBadgeStyle = (priority) => {
  switch (priority) {
    case 'URGENT':
      return { background: '#ef4444', color: '#ffffff' };
    case 'HIGH':
      return { background: '#f59e0b', color: '#ffffff' };
    case 'MEDIUM':
      return { background: '#3b82f6', color: '#ffffff' };
    case 'LOW':
      return { background: '#64748b', color: '#ffffff' };
    default:
      return { background: '#3b82f6', color: '#ffffff' };
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (announcementId) => {
    try {
      await api.patch(`/notifications/${announcementId}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === announcementId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleCardClick = (item) => {
    setSelectedNotification(item);
    if (!item.isRead) {
      markAsRead(item.id);
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'UNREAD') {
      return notifications.filter((item) => !item.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Notifications</h1>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--color-primary, #4461F2)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-secondary" style={{ margin: '0.3rem 0 0 0' }}>
            Stay updated with internal announcements and important company communications.
          </p>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            background: 'var(--color-bg-subtle, rgba(255, 255, 255, 0.05))',
            padding: '0.3rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
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
      </div>

      {error && (
        <div
          className="card"
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderColor: 'var(--color-danger)',
          }}
        >
          <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="text-secondary">Loading announcements…</p>
        </div>
      ) : null}

      {!isLoading && filteredNotifications.length === 0 ? (
        <div
          className="card animate-fade-in"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            style={{ opacity: 0.4, marginBottom: '1rem' }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No announcements</h3>
          <p className="text-secondary" style={{ margin: 0 }}>
            {filter === 'UNREAD'
              ? 'You have read all your announcements.'
              : 'There are no active announcements available for you at this time.'}
          </p>
        </div>
      ) : null}

      {/* Announcement Cards List */}
      {!isLoading && filteredNotifications.length > 0 && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredNotifications.map((item) => {
            const priorityBadge = getPriorityBadgeStyle(item.priority);
            const formattedTime = item.createdAt
              ? new Date(item.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '';

            return (
              <div
                key={item.id}
                className="card animate-fade-in"
                onClick={() => handleCardClick(item)}
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  borderLeft: item.isRead
                    ? '4px solid transparent'
                    : '4px solid var(--color-primary, #4461F2)',
                  backgroundColor: item.isRead
                    ? 'var(--color-bg-card, rgba(255, 255, 255, 0.02))'
                    : 'var(--color-bg-subtle, rgba(68, 97, 242, 0.04))',
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
                        ...priorityBadge,
                      }}
                    >
                      {item.priority}
                    </span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: item.isRead ? 'rgba(148, 163, 184, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: item.isRead ? '#94a3b8' : '#22c55e',
                      }}
                    >
                      {item.isRead ? 'Read' : '• New / Unread'}
                    </span>
                  </div>

                  <span className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formattedTime}
                  </span>
                </div>

                <h3
                  style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.1rem',
                    fontWeight: item.isRead ? 600 : 700,
                  }}
                >
                  {item.title}
                </h3>

                <p
                  className="text-secondary"
                  style={{
                    margin: 0,
                    lineHeight: 1.55,
                    fontSize: '0.92rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.description}
                </p>

                <div
                  style={{
                    marginTop: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                  }}
                  className="text-secondary"
                >
                  <span>
                    Posted by <strong>{item.createdBy?.name || 'Management'}</strong>
                  </span>
                  <span style={{ color: 'var(--color-primary, #4461F2)', fontWeight: 500 }}>
                    Click to view details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal view */}
      {selectedNotification && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '640px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      padding: '0.15rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      ...getPriorityBadgeStyle(selectedNotification.priority),
                    }}
                  >
                    {selectedNotification.priority}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>
                  {selectedNotification.title}
                </h2>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSelectedNotification(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
              Posted by <strong>{selectedNotification.createdBy?.name || 'Management'}</strong> on{' '}
              {new Date(selectedNotification.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>

            <div
              style={{
                background: 'var(--color-bg-subtle, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                padding: '1.25rem',
                borderRadius: '8px',
                lineHeight: '1.65',
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
            >
              {selectedNotification.description}
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedNotification(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
