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
} = require('./project.controller');

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', getProjects);
router.post('/', createProjectHandler);
router.get('/:id', getProject);
router.patch('/:id', updateProjectHandler);
router.post('/:id/archive', archiveProjectHandler);

module.exports = router;
