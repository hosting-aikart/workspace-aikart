const bcrypt = require('bcrypt');
const prismaModule = require('../../config/prisma');

const getPrisma = () => prismaModule.getPrisma();

const VALID_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  workspaceId: true,
  employeeId: true,
  phone: true,
  position: true,
  joiningDate: true,
  location: true,
  isActive: true,
  mustChangePassword: true,
  profilePhoto: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  reportingManager: { select: { id: true, name: true, email: true } },
};

const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  workspaceId: true,
  // isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
};

const normalizeRole = (role) => String(role || '').toUpperCase();

const buildEmployeeWhereClause = (workspaceId, options = {}) => {
  const where = { workspaceId };
  const search = (options.search || '').trim();
  const departmentId = (options.departmentId || '').trim();
  const role = (options.role || '').trim().toUpperCase();
  const status = (options.status || '').trim().toLowerCase();

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { employeeId: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (role && VALID_ROLES.includes(role)) {
    where.role = role;
  }

  if (status === 'active' || status === 'inactive') {
    where.isActive = status === 'active';
  }

  return where;
};

const getEmployees = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;
  const where = buildEmployeeWhereClause(workspaceId, options);

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: EMPLOYEE_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    employees,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

// Only the fields the workspace-wide directory actually renders (Directory
// page cards, Chat's "start a DM"/"new group" pickers) — no
// reportingManager join, which neither consumer uses.
const DIRECTORY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  position: true,
  phone: true,
  profilePhoto: true,
  department: { select: { id: true, name: true } },
};

/**
 * getWorkspaceDirectory
 * A lighter sibling of getEmployees for read-only "who's in my workspace"
 * lists (GET /me/directory) rather than the admin employee-management
 * table: no reportingManager join, no employeeId/joiningDate/location/
 * timestamps, and — since none of its callers page through results, they
 * all just request one big flat list — no `count()` query either. That
 * count was a full extra DB round trip on every single load of the Chat
 * page's sidebar (which fetches the directory to build its "Colleagues"
 * list) and the Directory page, for a number nothing displayed.
 */
const getWorkspaceDirectory = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const limit = Math.min(Number(options.limit) || 200, 500);

  const employees = await prisma.user.findMany({
    where: { workspaceId },
    take: limit,
    orderBy: { name: 'asc' },
    select: DIRECTORY_SELECT,
  });

  return { employees };
};

const getEmployeeById = async (workspaceId, employeeId) => {
  const prisma = getPrisma();
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, workspaceId },
    select: EMPLOYEE_SELECT,
  });

  if (!employee) {
    const err = new Error('Employee not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return employee;
};

const createEmployee = async (workspaceId, payload) => {
  const prisma = getPrisma();

  const existingEmail = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingEmail) {
    const err = new Error('An employee with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  if (payload.employeeId) {
    const existingEmployeeId = await prisma.user.findFirst({
      where: { workspaceId, employeeId: payload.employeeId },
    });

    if (existingEmployeeId) {
      const err = new Error(
        'An employee with this employee ID already exists in this workspace.',
      );
      err.statusCode = 409;
      throw err;
    }
  }

  const department = payload.departmentId
    ? await prisma.department.findFirst({
        where: { id: payload.departmentId, workspaceId },
      })
    : null;

  if (payload.departmentId && !department) {
    const err = new Error('Department not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const reportingManager = payload.reportingManagerId
    ? await prisma.user.findFirst({
        where: { id: payload.reportingManagerId, workspaceId },
      })
    : null;

  if (payload.reportingManagerId && !reportingManager) {
    const err = new Error('Reporting manager not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const createdEmployee = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: normalizeRole(payload.role),
      workspaceId,
      employeeId: payload.employeeId || null,
      phone: payload.phone || null,
      position: payload.position || null,
      location: payload.location || null,
      departmentId: payload.departmentId || null,
      reportingManagerId: payload.reportingManagerId || null,
      joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : null,
      profilePhoto: payload.profilePhoto || null,
      mustChangePassword: true,
      isActive: true,
    },
    select: EMPLOYEE_SELECT,
  });

  return createdEmployee;
};

const updateEmployee = async (workspaceId, employeeId, payload) => {
  const prisma = getPrisma();
  const existingEmployee = await prisma.user.findFirst({
    where: { id: employeeId, workspaceId },
    select: { id: true },
  });

  if (!existingEmployee) {
    const err = new Error('Employee not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  if (payload.email) {
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: payload.email, NOT: { id: employeeId } },
    });

    if (duplicateEmail) {
      const err = new Error('An employee with this email already exists.');
      err.statusCode = 409;
      throw err;
    }
  }

  if (payload.employeeId) {
    const duplicateEmployeeId = await prisma.user.findFirst({
      where: {
        workspaceId,
        employeeId: payload.employeeId,
        NOT: { id: employeeId },
      },
    });

    if (duplicateEmployeeId) {
      const err = new Error(
        'An employee with this employee ID already exists in this workspace.',
      );
      err.statusCode = 409;
      throw err;
    }
  }

  const updateData = {};

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.email !== undefined) updateData.email = payload.email;
  if (payload.phone !== undefined) updateData.phone = payload.phone || null;
  if (payload.position !== undefined)
    updateData.position = payload.position || null;
  if (payload.location !== undefined)
    updateData.location = payload.location || null;
  if (payload.employeeId !== undefined)
    updateData.employeeId = payload.employeeId;
  if (payload.departmentId !== undefined)
    updateData.departmentId = payload.departmentId || null;
  if (payload.reportingManagerId !== undefined)
    updateData.reportingManagerId = payload.reportingManagerId || null;
  if (payload.joiningDate !== undefined)
    updateData.joiningDate = payload.joiningDate
      ? new Date(payload.joiningDate)
      : null;
  if (payload.profilePhoto !== undefined)
    updateData.profilePhoto = payload.profilePhoto || null;
  if (payload.role !== undefined) updateData.role = normalizeRole(payload.role);

  const updatedEmployee = await prisma.user.update({
    where: { id: employeeId },
    data: updateData,
    select: EMPLOYEE_SELECT,
  });

  return updatedEmployee;
};

const updateEmployeeRole = async (workspaceId, employeeId, role) => {
  const prisma = getPrisma();
  const normalizedRole = normalizeRole(role);

  if (!VALID_ROLES.includes(normalizedRole)) {
    const err = new Error(
      'Invalid role. Allowed roles: ADMIN, MANAGER, EMPLOYEE',
    );
    err.statusCode = 400;
    throw err;
  }

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, workspaceId },
    select: { id: true },
  });

  if (!employee) {
    const err = new Error('Employee not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.user.update({
    where: { id: employeeId },
    data: { role: normalizedRole },
    select: EMPLOYEE_SELECT,
  });
};

const updateEmployeeStatus = async (workspaceId, employeeId, isActive) => {
  const prisma = getPrisma();
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, workspaceId },
    select: { id: true },
  });

  if (!employee) {
    const err = new Error('Employee not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.user.update({
    where: { id: employeeId },
    data: { isActive },
    select: EMPLOYEE_SELECT,
  });
};

const deleteEmployee = async (workspaceId, employeeId) => {
  const prisma = getPrisma();
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, workspaceId },
    select: { id: true },
  });

  if (!employee) {
    const err = new Error('Employee not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.user.update({
    where: { id: employeeId },
    data: { isActive: false },
    select: EMPLOYEE_SELECT,
  });
};

const getAdminStats = async (workspaceId) => {
  const prisma = getPrisma();

  const [
    totalUsers,
    totalEmployees,
    activeEmployees,
    adminCount,
    managerCount,
    employeeCount,
    departments,
  ] = await Promise.all([
    prisma.user.count({ where: { workspaceId } }),
    prisma.user.count({ where: { workspaceId } }),
    prisma.user.count({ where: { workspaceId, isActive: true } }),
    prisma.user.count({ where: { workspaceId, role: 'ADMIN' } }),
    prisma.user.count({ where: { workspaceId, role: 'MANAGER' } }),
    prisma.user.count({ where: { workspaceId, role: 'EMPLOYEE' } }),
    prisma.department?.count
      ? prisma.department.count({ where: { workspaceId } })
      : 0,
  ]);

  return {
    totalUsers,
    totalEmployees,
    activeEmployees,
    adminCount,
    managerCount,
    employeeCount,
    departments,
  };
};

const listDepartments = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;
  const status = String(options.status || '')
    .trim()
    .toLowerCase();

  const where = { workspaceId };
  if (status === 'active' || status === 'inactive') {
    where.isActive = status === 'active';
  }

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: DEPARTMENT_SELECT,
    }),
    prisma.department.count({ where }),
  ]);

  return {
    departments: departments.map((department) => ({
      ...department,
      employeeCount: department._count?.users ?? 0,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getDepartmentById = async (workspaceId, departmentId) => {
  const prisma = getPrisma();
  const department = await prisma.department.findFirst({
    where: { id: departmentId, workspaceId },
    select: DEPARTMENT_SELECT,
  });

  if (!department) {
    const err = new Error('Department not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...department,
    employeeCount: department._count?.users ?? 0,
  };
};

const createDepartment = async (workspaceId, payload) => {
  const prisma = getPrisma();
  const normalizedName = String(payload.name || '').trim();

  if (!normalizedName) {
    const err = new Error('Department name is required.');
    err.statusCode = 400;
    throw err;
  }

  const existingDepartment = await prisma.department.findFirst({
    where: {
      workspaceId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existingDepartment) {
    const err = new Error(
      'A department with this name already exists in this workspace.',
    );
    err.statusCode = 409;
    throw err;
  }

  const createdDepartment = await prisma.department.create({
    data: {
      name: normalizedName,
      workspaceId,
      isActive: true,
    },
    select: DEPARTMENT_SELECT,
  });

  return {
    ...createdDepartment,
    employeeCount: createdDepartment._count?.users ?? 0,
  };
};

const updateDepartment = async (workspaceId, departmentId, payload) => {
  const prisma = getPrisma();
  const normalizedName = String(payload.name || '').trim();

  if (!normalizedName) {
    const err = new Error('Department name is required.');
    err.statusCode = 400;
    throw err;
  }

  const existingDepartment = await prisma.department.findFirst({
    where: { id: departmentId, workspaceId },
    select: { id: true },
  });

  if (!existingDepartment) {
    const err = new Error('Department not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const duplicateDepartment = await prisma.department.findFirst({
    where: {
      workspaceId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
      NOT: { id: departmentId },
    },
    select: { id: true },
  });

  if (duplicateDepartment) {
    const err = new Error(
      'A department with this name already exists in this workspace.',
    );
    err.statusCode = 409;
    throw err;
  }

  const updatedDepartment = await prisma.department.update({
    where: { id: departmentId },
    data: { name: normalizedName },
    select: DEPARTMENT_SELECT,
  });

  return {
    ...updatedDepartment,
    employeeCount: updatedDepartment._count?.users ?? 0,
  };
};

const deleteDepartment = async (workspaceId, departmentId) => {
  const prisma = getPrisma();
  const department = await prisma.department.findFirst({
    where: { id: departmentId, workspaceId },
    select: { id: true, _count: { select: { users: true } } },
  });

  if (!department) {
    const err = new Error('Department not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const activeUsers = await prisma.user.count({
    where: { workspaceId, departmentId, isActive: true },
  });

  if (activeUsers > 0) {
    const err = new Error(
      'This department still contains active employees. Deactivating it will prevent new employees from being assigned to this department while preserving existing employee records.',
    );
    err.statusCode = 409;
    throw err;
  }

  return prisma.department.update({
    where: { id: departmentId },
    data: { isActive: false },
    select: DEPARTMENT_SELECT,
  });
};

const activateDepartment = async (workspaceId, departmentId) => {
  const prisma = getPrisma();
  const department = await prisma.department.findFirst({
    where: { id: departmentId, workspaceId },
    select: { id: true },
  });

  if (!department) {
    const err = new Error('Department not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.department.update({
    where: { id: departmentId },
    data: { isActive: true },
    select: DEPARTMENT_SELECT,
  });
};

const listUsers = async (workspaceId, options = {}) => {
  const data = await getEmployees(workspaceId, options);
  return {
    users: data.employees,
    pagination: data.pagination,
  };
};

const updateUserRole = async (userId, workspaceId, role) => {
  const prisma = getPrisma();
  const normalizedRole = normalizeRole(role);

  if (!VALID_ROLES.includes(normalizedRole)) {
    const err = new Error(
      'Invalid role. Allowed roles: ADMIN, MANAGER, EMPLOYEE',
    );
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await prisma.user.findFirst({
    where: { id: userId, workspaceId },
    select: { id: true },
  });

  if (!existingUser) {
    const err = new Error('User not found in this workspace');
    err.statusCode = 404;
    throw err;
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: normalizedRole },
  });
};

const listWorkspaceAttendance = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;

  const where = {
    user: { workspaceId },
  };

  if (options.from || options.to) {
    where.date = {};
    if (options.from) where.date.gte = new Date(options.from);
    if (options.to) where.date.lte = new Date(options.to);
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.employee) {
    where.user.name = { contains: options.employee, mode: 'insensitive' };
  }

  if (options.department) {
    where.user.departmentId = options.department;
  }

  const [attendance, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        status: true,
        totalSeconds: true,
        checkIn: true,
        checkOut: true,
        user: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    attendance,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const adjustAttendance = async (workspaceId, attendanceId, payload) => {
  const prisma = getPrisma();

  const record = await prisma.attendance.findFirst({
    where: { id: attendanceId, user: { workspaceId } },
  });

  if (!record) {
    const err = new Error('Attendance record not found in workspace.');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (payload.status !== undefined) {
    updateData.status = payload.status;
  }

  if (payload.checkIn !== undefined) {
    updateData.checkIn = payload.checkIn ? new Date(payload.checkIn) : null;
  }

  if (payload.checkOut !== undefined) {
    updateData.checkOut = payload.checkOut ? new Date(payload.checkOut) : null;
  }

  const resolvedCheckIn = payload.checkIn !== undefined ? (payload.checkIn ? new Date(payload.checkIn) : null) : record.checkIn;
  const resolvedCheckOut = payload.checkOut !== undefined ? (payload.checkOut ? new Date(payload.checkOut) : null) : record.checkOut;

  if (resolvedCheckIn && resolvedCheckOut) {
    updateData.totalSeconds = Math.max(0, Math.round((resolvedCheckOut - resolvedCheckIn) / 1000));
  }

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

const getAttendanceStats = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const where = {
    user: { workspaceId },
  };

  if (options.from || options.to) {
    where.date = {};
    if (options.from) where.date.gte = new Date(options.from);
    if (options.to) where.date.lte = new Date(options.to);
  }

  const records = await prisma.attendance.findMany({
    where,
    select: { status: true, totalSeconds: true },
  });

  return {
    totalRecords: records.length,
    workingCount: records.filter((record) => record.status === 'WORKING')
      .length,
    pausedCount: records.filter((record) => record.status === 'PAUSED').length,
    checkedOutCount: records.filter((record) => record.status === 'CHECKED_OUT')
      .length,
    totalSeconds: records.reduce(
      (sum, record) => sum + Number(record.totalSeconds || 0),
      0,
    ),
  };
};

const getAdminReport = async (workspaceId, options = {}) => {
  const [summary, attendance] = await Promise.all([
    getAdminStats(workspaceId),
    getAttendanceStats(workspaceId, options),
  ]);

  return {
    summary,
    attendance,
  };
};

module.exports = {
  getEmployees,
  getWorkspaceDirectory,
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
  activateDepartment,
  listUsers,
  updateUserRole,
  listWorkspaceAttendance,
  getAttendanceStats,
  getAdminReport,
  adjustAttendance,
};
