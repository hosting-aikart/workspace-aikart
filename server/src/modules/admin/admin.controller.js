const { sendSuccess, sendError } = require('../../utils/apiResponse');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeRole,
  updateEmployeeStatus,
  deleteEmployee,
  getAdminStats,
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listWorkspaceAttendance,
  getAttendanceStats,
  getAdminReport,
  adjustAttendance,
} = require('./admin.service');
const {
  employeeCreateSchema,
  employeeUpdateSchema,
  roleUpdateSchema,
  statusUpdateSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
} = require('./admin.validation');

const getUsers = async (req, res) => {
  try {
    const data = await getEmployees(req.user.workspaceId, {
      search: req.query.search,
      departmentId: req.query.departmentId,
      role: req.query.role,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch employees.', 500);
  }
};

const getEmployee = async (req, res) => {
  try {
    const data = await getEmployeeById(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return sendError(
      res,
      err.message || 'Failed to fetch employee.',
      statusCode,
    );
  }
};

const createEmployeeHandler = async (req, res) => {
  try {
    const body = employeeCreateSchema.parse(req.body);
    const data = await createEmployee(req.user.workspaceId, body);
    return sendSuccess(res, data, 201);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    const message = err.errors && err.errors.length > 0 ? err.errors[0].message : (err.message || 'Failed to create employee.');
    return sendError(res, message, statusCode);
  }
};

const updateEmployeeHandler = async (req, res) => {
  try {
    const body = employeeUpdateSchema.parse(req.body);
    const data = await updateEmployee(
      req.user.workspaceId,
      req.params.id,
      body,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    const message = err.errors && err.errors.length > 0 ? err.errors[0].message : (err.message || 'Failed to update employee.');
    return sendError(res, message, statusCode);
  }
};

const updateEmployeeRoleHandler = async (req, res) => {
  try {
    const body = roleUpdateSchema.parse(req.body);
    const data = await updateEmployeeRole(
      req.user.workspaceId,
      req.params.id,
      body.role,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to update employee role.',
      statusCode,
    );
  }
};

const updateEmployeeStatusHandler = async (req, res) => {
  try {
    const body = statusUpdateSchema.parse(req.body);
    const data = await updateEmployeeStatus(
      req.user.workspaceId,
      req.params.id,
      body.isActive,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to update employee status.',
      statusCode,
    );
  }
};

const deleteEmployeeHandler = async (req, res) => {
  try {
    const data = await deleteEmployee(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to deactivate employee.',
      statusCode,
    );
  }
};

const getStats = async (req, res) => {
  try {
    const data = await getAdminStats(req.user.workspaceId);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch admin stats.', 500);
  }
};

const getDepartments = async (req, res) => {
  try {
    const data = await listDepartments(req.user.workspaceId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch departments.', 500);
  }
};

const getDepartment = async (req, res) => {
  try {
    const data = await getDepartmentById(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return sendError(
      res,
      err.message || 'Failed to fetch department.',
      statusCode,
    );
  }
};

const createDepartmentHandler = async (req, res) => {
  try {
    const body = departmentCreateSchema.parse(req.body);
    const data = await createDepartment(req.user.workspaceId, body);
    return sendSuccess(res, data, 201);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to create department.',
      statusCode,
    );
  }
};

const updateDepartmentHandler = async (req, res) => {
  try {
    const body = departmentUpdateSchema.parse(req.body);
    const data = await updateDepartment(
      req.user.workspaceId,
      req.params.id,
      body,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to update department.',
      statusCode,
    );
  }
};

const deleteDepartmentHandler = async (req, res) => {
  try {
    const data = await deleteDepartment(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to delete department.',
      statusCode,
    );
  }
};

const getWorkspaceAttendance = async (req, res) => {
  try {
    const data = await listWorkspaceAttendance(req.user.workspaceId, {
      from: req.query.from,
      to: req.query.to,
      page: req.query.page,
      limit: req.query.limit,
      employee: req.query.employee,
      department: req.query.department,
      status: req.query.status,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch attendance.', 500);
  }
};

const adjustAttendanceHandler = async (req, res) => {
  try {
    const data = await adjustAttendance(req.user.workspaceId, req.params.id, req.body);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(res, err.message || 'Failed to adjust attendance.', statusCode);
  }
};

const getAttendanceDashboard = async (req, res) => {
  try {
    const data = await getAttendanceStats(req.user.workspaceId, {
      from: req.query.from,
      to: req.query.to,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(
      res,
      err.message || 'Failed to fetch attendance stats.',
      500,
    );
  }
};

const getReport = async (req, res) => {
  try {
    const data = await getAdminReport(req.user.workspaceId, {
      from: req.query.from,
      to: req.query.to,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch admin report.', 500);
  }
};

module.exports = {
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
};
