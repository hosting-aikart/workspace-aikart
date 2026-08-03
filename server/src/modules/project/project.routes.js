const { Router } = require('express');
const {
  requireAuth,
  requireRole,
} = require('../../middleware/auth.middleware');
const {
  createProjectHandler,
  getProjects,
  getProject,
  updateProjectHandler,
  archiveProjectHandler,
  progressProjectHandler,
  addMemberHandler,
  removeMemberHandler,
  getProjectTasksHandler,
  createProjectTaskHandler,
} = require('./project.controller');

const router = Router();

router.use(requireAuth);

router.get('/', getProjects);
router.get('/:id', getProject);
router.get('/:id/tasks', getProjectTasksHandler);

router.post('/', requireRole('ADMIN', 'MANAGER'), createProjectHandler);
router.post(
  '/:id/tasks',
  requireRole('ADMIN', 'MANAGER'),
  createProjectTaskHandler,
);
router.patch('/:id', requireRole('ADMIN', 'MANAGER'), updateProjectHandler);
router.patch(
  '/:id/archive',
  requireRole('ADMIN', 'MANAGER'),
  archiveProjectHandler,
);
router.patch(
  '/:id/progress',
  requireRole('ADMIN', 'MANAGER'),
  progressProjectHandler,
);
router.post('/:id/members', requireRole('ADMIN', 'MANAGER'), addMemberHandler);
router.delete(
  '/:id/members/:userId',
  requireRole('ADMIN', 'MANAGER'),
  removeMemberHandler,
);

module.exports = router;
