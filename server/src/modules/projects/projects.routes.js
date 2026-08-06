const { Router } = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./projects.controller');

const router = Router();

router.use(requireAuth); // Every route requires a logged-in user

router.post('/', requireRole('ADMIN', 'MANAGER'), controller.createProjectHandler);
router.get('/', controller.getProjectsHandler);
router.get('/:id', controller.getProjectHandler);
router.patch('/:id', controller.updateProjectHandler);
router.delete('/:id', controller.deleteProjectHandler);

router.post('/:id/members', controller.addMemberHandler);
router.delete('/:id/members/:userId', controller.removeMemberHandler);

module.exports = router;
