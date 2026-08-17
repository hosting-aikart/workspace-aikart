const notificationService = require('./notification.service');

const getNotificationsHandler = async (req, res) => {
  try {
    const notifications = await notificationService.listNotifications(req.user.workspaceId, req.user.id, {
      unreadOnly: req.query.unreadOnly === 'true',
      limit: req.query.limit,
    });
    return res.json({ status: 'success', data: notifications });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const getUnreadCountHandler = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.workspaceId, req.user.id);
    return res.json({ status: 'success', data: { count } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const markReadHandler = async (req, res) => {
  try {
    await notificationService.markRead(req.user.workspaceId, req.user.id, req.params.id);
    return res.json({ status: 'success' });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const markAllReadHandler = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.workspaceId, req.user.id);
    return res.json({ status: 'success' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const clearOneHandler = async (req, res) => {
  try {
    await notificationService.clearNotifications(req.user.workspaceId, req.user.id, {
      notificationId: req.params.id,
    });
    return res.json({ status: 'success' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const clearAllHandler = async (req, res) => {
  try {
    await notificationService.clearNotifications(req.user.workspaceId, req.user.id, {
      onlyRead: req.query.onlyRead === 'true',
    });
    return res.json({ status: 'success' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getNotificationsHandler,
  getUnreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  clearOneHandler,
  clearAllHandler,
};
