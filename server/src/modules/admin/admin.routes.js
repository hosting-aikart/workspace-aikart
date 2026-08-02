const { Router } = require('express');
const {
  requireAuth,
  requireRole,
} = require('../../middleware/auth.middleware');
const {
  getUsers,
  getEmployee,
  createEmployeeHandler,
  updateEmployeeHandler,
  updateEmployeeRoleHandler,
  updateEmployeeStatusHandler,
  deleteEmployeeHandler,
  getStats,
  getDepartments,
  getDepartment,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
  getWorkspaceAttendance,
  getAttendanceDashboard,
  getReport,
} = require('./admin.controller');

const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/employees', getUsers);
router.get('/employees/:id', getEmployee);
router.post('/employees', createEmployeeHandler);
router.patch('/employees/:id', updateEmployeeHandler);
router.patch('/employees/:id/role', updateEmployeeRoleHandler);
router.patch('/employees/:id/status', updateEmployeeStatusHandler);
router.delete('/employees/:id', deleteEmployeeHandler);
router.get('/departments', getDepartments);
router.get('/departments/:id', getDepartment);
router.post('/departments', createDepartmentHandler);
router.patch('/departments/:id', updateDepartmentHandler);
router.delete('/departments/:id', deleteDepartmentHandler);
router.get('/attendance', getWorkspaceAttendance);
router.get('/attendance/stats', getAttendanceDashboard);
router.get('/reports', getReport);
router.get('/dashboard', getStats);

module.exports = router;
