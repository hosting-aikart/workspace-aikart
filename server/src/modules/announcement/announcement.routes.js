const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const {
  createAnnouncementHandler,
  getAnnouncementsHandler,
  getAnnouncementHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler,
} = require('./announcement.controller');

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.post('/', createAnnouncementHandler);
router.get('/', getAnnouncementsHandler);
router.get('/:id', getAnnouncementHandler);
router.patch('/:id', updateAnnouncementHandler);
router.delete('/:id', deleteAnnouncementHandler);

module.exports = router;
