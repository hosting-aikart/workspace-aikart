const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const {
  getDashboardHandler,
  getAttendanceHandler,
  getTeamHandler,
  updateTeamMemberHandler,
} = require('./manager.controller');

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'MANAGER'));

router.get('/dashboard', getDashboardHandler);
router.get('/attendance', getAttendanceHandler);
router.get('/team', getTeamHandler);
router.patch('/team/:id', updateTeamMemberHandler);

module.exports = router;
