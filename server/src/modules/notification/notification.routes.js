const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  getNotificationsHandler,
  getUnreadCountHandler,
  markReadHandler,
  markAllReadHandler,
  clearOneHandler,
  clearAllHandler,
} = require('./notification.controller');

const router = Router();

router.use(requireAuth);

router.get('/', getNotificationsHandler);
router.get('/unread-count', getUnreadCountHandler);
router.patch('/read-all', markAllReadHandler);
router.patch('/:id/read', markReadHandler);
router.delete('/clear', clearAllHandler);
router.delete('/:id', clearOneHandler);

module.exports = router;
