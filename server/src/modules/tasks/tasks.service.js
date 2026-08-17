const prismaModule = require('../../config/prisma');
const notificationService = require('../notification/notification.service');

const getPrisma = () => {
  return prismaModule.getPrisma();
};

const normalizeTaskStatus = (status) => String(status || '').toUpperCase();
const normalizeTaskPriority = (priority) =>
  String(priority || '').toUpperCase();

const assigneeSelect = { id: true, name: true, email: true, role: true, profilePhoto: true };

/**
 * notifyTaskAssigned
 * Tells whoever a task just got (re)assigned to, live over the socket —
 * mirrors the pattern in chat.service.js's notifyDirectMessage: best-effort,
 * a failed push here shouldn't fail the task create/update it's attached to.
 */
const notifyTaskAssigned = async (workspaceId, task, actorId) => {
  try {
    const prisma = getPrisma();
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    await notificationService.createNotification(workspaceId, task.assignedToId, {
      type: 'TASK_ASSIGNED',
      title: 'New task assigned to you',
      body: `${actor?.name || 'Someone'} assigned you "${task.title}"${task.project?.name ? ` in ${task.project.name}` : ''}.`,
      link: '/app/tasks',
      entityId: task.id,
    });
  } catch (err) {
    console.error('Failed to notify task assignee:', err.message);
  }
};

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

  const assignedToId = payload.assignedToId || null;
  if (assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: { id: assignedToId, workspaceId },
      select: { id: true },
    });
    if (!assignee) {
      throw new Error('Assignee not found in this workspace');
    }
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      projectId: projectId,
      createdById: userId,
      assignedToId,
      priority: normalizeTaskPriority(payload.priority) || 'MEDIUM',
      status: normalizeTaskStatus(payload.status) || 'TODO',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignedTo: { select: assigneeSelect },
    },
  });

  console.log(`[TASK OPERATION] User ID: ${userId} (${userRole}) created task ID: ${task.id} (Title: "${task.title}") under project ID: ${projectId}.`);

  // Don't notify someone for assigning a task to themselves.
  if (assignedToId && assignedToId !== userId) {
    await notifyTaskAssigned(workspaceId, task, userId);
  }

  return task;
};

const getTasks = async (workspaceId, filters = {}, userId, userRole) => {
  const prisma = getPrisma();

  const where = {
    project: {
      workspaceId,
    },
  };

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
      assignedTo: { select: assigneeSelect },
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
      },
    },
    include: {
      project: {
        select: { id: true, name: true, status: true },
      },
      assignedTo: { select: assigneeSelect },
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
      },
    },
    select: { id: true, projectId: true, assignedToId: true },
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

  // Track whether this actually hands the task to someone new, so we know
  // whether to push a notification below — reassigning to the same person,
  // or just touching other fields, shouldn't re-notify them.
  let reassigned = false;
  if (payload.assignedToId !== undefined) {
    const nextAssigneeId = payload.assignedToId || null;
    if (nextAssigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: nextAssigneeId, workspaceId },
        select: { id: true },
      });
      if (!assignee) {
        throw new Error('Assignee not found in this workspace');
      }
    }
    updateData.assignedToId = nextAssigneeId;
    reassigned = nextAssigneeId !== task.assignedToId;
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignedTo: { select: assigneeSelect },
    },
  });

  console.log(`[TASK OPERATION] User ID: ${userId} (${userRole}) updated task ID: ${taskId}. Payload: ${JSON.stringify(payload)}`);

  if (reassigned && updatedTask.assignedToId && updatedTask.assignedToId !== userId) {
    await notifyTaskAssigned(workspaceId, updatedTask, userId);
  }

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

  console.log(`[TASK OPERATION] User ID: ${userId} (${userRole}) deleted task ID: ${taskId}.`);

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
