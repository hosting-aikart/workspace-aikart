const notificationService = require('./notification.service');

const getNotificationsHandler = async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(
      req.user.workspaceId,
      req.user.id,
    );
    return res.json({ status: 'success', data: notifications });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const markReadHandler = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const result = await notificationService.markNotificationAsRead(
      req.user.workspaceId,
      req.user.id,
      announcementId,
    );
    return res.json({ status: 'success', data: result });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('denied')) {
      return res.status(404).json({ status: 'error', message: error.message });
    }
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getNotificationsHandler,
  markReadHandler,
};
