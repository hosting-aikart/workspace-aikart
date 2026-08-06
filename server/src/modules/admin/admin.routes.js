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
  adjustAttendanceHandler,
} = require('./admin.controller');

const router = Router();

router.use(requireAuth);
// Allow ADMIN and MANAGER to manage employees
router.get('/employees', requireRole('ADMIN', 'MANAGER'), getUsers);
router.get('/employees/:id', requireRole('ADMIN', 'MANAGER'), getEmployee);
router.post('/employees', requireRole('ADMIN', 'MANAGER'), createEmployeeHandler);
router.patch('/employees/:id', requireRole('ADMIN', 'MANAGER'), updateEmployeeHandler);
router.patch('/employees/:id/role', requireRole('ADMIN', 'MANAGER'), updateEmployeeRoleHandler);
router.patch('/employees/:id/status', requireRole('ADMIN', 'MANAGER'), updateEmployeeStatusHandler);
router.delete('/employees/:id', requireRole('ADMIN', 'MANAGER'), deleteEmployeeHandler);

// Allow ADMIN and MANAGER to read departments and dashboard for EmployeesPage
router.get('/departments', requireRole('ADMIN', 'MANAGER'), getDepartments);
router.get('/dashboard', requireRole('ADMIN', 'MANAGER'), getStats);

// Keep ADMIN only for the rest
router.use(requireRole('ADMIN'));
router.get('/departments/:id', getDepartment);
router.post('/departments', createDepartmentHandler);
router.patch('/departments/:id', updateDepartmentHandler);
router.delete('/departments/:id', deleteDepartmentHandler);
router.get('/attendance', getWorkspaceAttendance);
router.get('/attendance/stats', getAttendanceDashboard);
router.patch('/attendance/:id', adjustAttendanceHandler);
router.get('/reports', getReport);
router.get('/dashboard', getStats);

module.exports = router;
