const { Router } = require('express');
const {
  requireAuth,
  requireRole,
} = require('../../middleware/auth.middleware');
const controller = require('./tasks.controller');

const router = Router();

router.use(requireAuth); // Every route requires a logged-in user

router.post('', controller.createTaskHandler);
router.post('/', controller.createTaskHandler);
router.get('', controller.getTasksHandler);
router.get('/', controller.getTasksHandler);
router.get('/:id', controller.getTaskHandler);
router.patch('/:id', controller.updateTaskHandler);
router.patch('/:id/status', controller.updateTaskStatusHandler);
router.delete('/:id', controller.deleteTaskHandler);

module.exports = router;
