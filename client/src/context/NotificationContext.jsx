import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { connectSocket } from '../utils/socket';
import { requestNotificationPermission, showDesktopNotification } from '../utils/desktopNotifications';
import logoIcon from '../assets/aikart-logo-transparent.png';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const RECENT_LIMIT = 30;

/**
 * NotificationProvider
 * App-wide (not just the Chat page) so the bell badge in TopNavbar stays
 * live no matter which page is open. Shares the same Socket.IO singleton
 * connection the Chat module uses (utils/socket.js) — whichever mounts
 * first establishes it, and it's torn down once on logout (AuthContext),
 * not when either consumer unmounts.
 */
export function NotificationProvider({ children }) {
  const { accessToken, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [{ data: listRes }, { data: countRes }] = await Promise.all([
        api.get('/notifications', { params: { limit: RECENT_LIMIT } }),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch {
      // Silent — the bell just stays at its last known state until the
      // next successful refresh or live push.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    refresh();
    requestNotificationPermission();

    const socket = connectSocket(accessToken);
    const handleNew = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, RECENT_LIMIT));
      setUnreadCount((prev) => prev + 1);
      showDesktopNotification(notification.title, {
        body: notification.body,
        tag: notification.id,
        icon: logoIcon,
      });
    };
    socket.on('notification:new', handleNew);

    return () => socket.off('notification:new', handleNew);
  }, [isAuthenticated, accessToken, refresh]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      refresh();
    }
  }, [refresh]);

  const clearOne = useCallback(async (id) => {
    const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      refresh();
    }
  }, [notifications, refresh]);

  const clearAll = useCallback(async ({ onlyRead = false } = {}) => {
    setNotifications((prev) => (onlyRead ? prev.filter((n) => !n.isRead) : []));
    if (!onlyRead) setUnreadCount(0);
    try {
      await api.delete('/notifications/clear', { params: { onlyRead } });
    } catch {
      refresh();
    }
  }, [refresh]);

  const value = {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    clearOne,
    clearAll,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
