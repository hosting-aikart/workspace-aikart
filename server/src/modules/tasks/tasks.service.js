const prismaModule = require('../../config/prisma');

const getPrisma = () => {
  return prismaModule.getPrisma();
};

const normalizeTaskStatus = (status) => String(status || '').toUpperCase();
const normalizeTaskPriority = (priority) =>
  String(priority || '').toUpperCase();

const ensureProjectAccess = async (
  prisma,
  workspaceId,
  projectId,
  userId,
  userRole,
) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true, createdById: true, managerId: true },
  });

  if (!project) {
    throw new Error('Project not found in this workspace');
  }

  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    return project;
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });

  if (!membership) {
    throw new Error('You must be a member of the project to manage tasks');
  }

  return project;
};

const createTask = async (workspaceId, userId, userRole, payload) => {
  const prisma = getPrisma();

  let projectId = payload?.projectId;

  if (!projectId) {
    const defaultProject =
      (await prisma.project.findFirst({
        where: {
          workspaceId,
          isArchived: false,
          OR: [
            { managerId: userId },
            { createdById: userId },
            { members: { some: { userId } } },
          ],
        },
        select: { id: true },
      })) ||
      (await prisma.project.findFirst({
        where: { workspaceId, isArchived: false },
        select: { id: true },
      }));

    if (!defaultProject) {
      throw new Error('A project is required to create a task. Please create a project first.');
    }
    projectId = defaultProject.id;
  }

  await ensureProjectAccess(
    prisma,
    workspaceId,
    projectId,
    userId,
    userRole,
  );

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      projectId: projectId,
      createdById: userId,
      priority: normalizeTaskPriority(payload.priority) || 'MEDIUM',
      status: normalizeTaskStatus(payload.status) || 'TODO',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
  });

  return task;
};

const getTasks = async (workspaceId, filters = {}, userId, userRole) => {
  const prisma = getPrisma();

  const where = {
    project: {
      workspaceId,
      OR: [
        { createdById: userId },
        { managerId: userId },
        { members: { some: { userId } } },
      ],
    },
  };

  if (userRole === 'ADMIN') {
    delete where.project.OR;
    where.project.workspaceId = workspaceId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.status) {
    where.status = normalizeTaskStatus(filters.status);
  }
  if (filters.priority) {
    where.priority = normalizeTaskPriority(filters.priority);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  return tasks;
};

const getTaskById = async (workspaceId, taskId, userId, userRole) => {
  const prisma = getPrisma();

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId,
        OR:
          userRole === 'ADMIN'
            ? undefined
            : [
                { createdById: userId },
                { managerId: userId },
                { members: { some: { userId } } },
              ],
      },
    },
    include: {
      project: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  return task;
};

const updateTask = async (workspaceId, taskId, userId, userRole, payload) => {
  const prisma = getPrisma();

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId,
        OR:
          userRole === 'ADMIN'
            ? undefined
            : [
                { createdById: userId },
                { managerId: userId },
                { members: { some: { userId } } },
              ],
      },
    },
    select: { id: true, projectId: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await ensureProjectAccess(
    prisma,
    workspaceId,
    task.projectId,
    userId,
    userRole,
  );

  const updateData = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined)
    updateData.description = payload.description || null;
  if (payload.status !== undefined)
    updateData.status = normalizeTaskStatus(payload.status);
  if (payload.priority !== undefined)
    updateData.priority = normalizeTaskPriority(payload.priority);
  if (payload.dueDate !== undefined)
    updateData.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: {
        select: { id: true, name: true },
      },
    },
  });

  return updatedTask;
};

const updateTaskStatus = async (
  workspaceId,
  taskId,
  userId,
  userRole,
  status,
) => {
  return updateTask(workspaceId, taskId, userId, userRole, { status });
};

const deleteTask = async (workspaceId, taskId, userId, userRole) => {
  const prisma = getPrisma();

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        workspaceId,
        OR:
          userRole === 'ADMIN'
            ? undefined
            : [
                { createdById: userId },
                { managerId: userId },
                { members: { some: { userId } } },
              ],
      },
    },
    select: { id: true, projectId: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await ensureProjectAccess(
    prisma,
    workspaceId,
    task.projectId,
    userId,
    userRole,
  );

  await prisma.task.delete({
    where: { id: taskId },
  });

  return true;
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
