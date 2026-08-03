const prismaModule = require('../../config/prisma');

const getPrisma = () => prismaModule.getPrisma();

const getTeamMembers = async (workspaceId, managerUserId) => {
  const prisma = getPrisma();

  // Fetch all active workspace employees so directory is never empty
  const members = await prisma.user.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      position: true,
      phone: true,
      joiningDate: true,
      isActive: true,
      reportingManagerId: true,
      reportingManager: {
        select: { id: true, name: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return members;
};

const updateTeamMember = async (workspaceId, managerUserId, targetUserId, payload) => {
  const prisma = getPrisma();

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, workspaceId },
  });

  if (!user) {
    throw new Error('Employee not found in workspace.');
  }

  const updateData = {};
  if (payload.position !== undefined) updateData.position = payload.position;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.departmentId !== undefined) updateData.departmentId = payload.departmentId || null;

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      position: true,
      phone: true,
      department: { select: { id: true, name: true } },
    },
  });

  return updated;
};

const getTeamDashboard = async (workspaceId, managerUserId) => {
  const prisma = getPrisma();

  // 1. Fetch team members
  const teamMembers = await getTeamMembers(workspaceId, managerUserId);
  const teamUserIds = teamMembers.map((m) => m.id);

  // 2. Fetch managed projects
  const managedProjects = await prisma.project.findMany({
    where: {
      workspaceId,
      isArchived: false,
      OR: [
        { managerId: managerUserId },
        { createdById: managerUserId },
      ],
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projectIds = managedProjects.map((p) => p.id);

  // 3. Fetch tasks for managed projects
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projectIds.length > 0 ? projectIds : ['none'] },
    },
    select: { id: true, status: true, priority: true, title: true, dueDate: true, projectId: true },
  });

  const pendingTasks = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'COMPLETED');
  const completedTasks = tasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED');

  // 4. Fetch today's team attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      date: today,
      userId: { in: teamUserIds.length > 0 ? teamUserIds : ['none'] },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const checkedInCount = attendanceRecords.filter((a) => a.status === 'WORKING' || a.status === 'CHECKED_OUT').length;

  return {
    teamMembersCount: teamMembers.length,
    teamMembers,
    managedProjectsCount: managedProjects.length,
    managedProjects,
    taskMetrics: {
      total: tasks.length,
      pending: pendingTasks.length,
      completed: completedTasks.length,
    },
    todayAttendance: {
      totalTeam: teamMembers.length,
      checkedIn: checkedInCount,
      records: attendanceRecords,
    },
  };
};

const getTeamAttendance = async (workspaceId, managerUserId) => {
  const prisma = getPrisma();
  const teamMembers = await getTeamMembers(workspaceId, managerUserId);
  const teamUserIds = teamMembers.map((m) => m.id);

  const attendanceLogs = await prisma.attendance.findMany({
    where: {
      userId: { in: teamUserIds.length > 0 ? teamUserIds : ['none'] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          position: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 100,
  });

  return attendanceLogs;
};

module.exports = {
  getTeamMembers,
  updateTeamMember,
  getTeamDashboard,
  getTeamAttendance,
};
