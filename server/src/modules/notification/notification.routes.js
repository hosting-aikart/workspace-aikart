const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  getNotificationsHandler,
  markReadHandler,
} = require('./notification.controller');

const router = Router();

router.use(requireAuth);

router.get('/', getNotificationsHandler);
router.patch('/:announcementId/read', markReadHandler);

module.exports = router;
