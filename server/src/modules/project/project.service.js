const prismaModule = require('../../config/prisma');

const getPrisma = () => {
  const prisma = prismaModule.getPrisma();
  if (!prisma) {
    const err = new Error('Prisma client is not ready for project operations.');
    err.statusCode = 500;
    throw err;
  }
  return prisma;
};

const normalizeStatus = (status) => String(status || '').toUpperCase();
const normalizePriority = (priority) => String(priority || '').toUpperCase();
const normalizeMemberIds = (memberIds = []) => {
  const seen = new Set();
  return (Array.isArray(memberIds) ? memberIds : [])
    .map((memberId) => String(memberId || '').trim())
    .filter(
      (memberId) => memberId && !seen.has(memberId) && seen.add(memberId),
    );
};

const ensureWorkspaceUser = async (prisma, workspaceId, userId, message) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, workspaceId, isActive: true },
    select: { id: true },
  });

  if (!user) {
    const err = new Error(message);
    err.statusCode = 404;
    throw err;
  }

  return user;
};

const syncProjectMembers = async (
  prisma,
  workspaceId,
  projectId,
  memberIds = [],
) => {
  const desiredIds = normalizeMemberIds(memberIds);
  const currentMemberships = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  const existingIds = currentMemberships.map((membership) => membership.userId);
  const toAdd = desiredIds.filter((userId) => !existingIds.includes(userId));
  const toRemove = existingIds.filter((userId) => !desiredIds.includes(userId));

  for (const userId of toAdd) {
    await ensureWorkspaceUser(
      prisma,
      workspaceId,
      userId,
      'One or more selected team members could not be found in this workspace.',
    );

    await prisma.projectMember.create({ data: { projectId, userId } });
  }

  if (toRemove.length) {
    await prisma.projectMember.deleteMany({
      where: { projectId, userId: { in: toRemove } },
    });
  }
};

const PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  progress: true,
  startDate: true,
  deadline: true,
  workspaceId: true,
  createdById: true,
  managerId: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
  manager: {
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      position: true,
      department: { select: { id: true, name: true } },
    },
  },
  members: {
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeId: true,
          position: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
};

const createProject = async (workspaceId, payload = {}) => {
  const prisma = getPrisma();
  const normalizedName = String(payload.name || '').trim();

  if (!normalizedName) {
    const err = new Error('Project name is required.');
    err.statusCode = 400;
    throw err;
  }

  if (payload.managerId) {
    await ensureWorkspaceUser(
      prisma,
      workspaceId,
      payload.managerId,
      'Selected project manager was not found in this workspace.',
    );
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      workspaceId,
      name: {
        equals: normalizedName,
        mode: 'insensitive',
      },
    },
  });

  if (existingProject) {
    const err = new Error(
      'A project with this name already exists in this workspace.',
    );
    err.statusCode = 409;
    throw err;
  }

  const createdProject = await prisma.project.create({
    data: {
      workspaceId,
      createdById: payload.createdById || null,
      managerId: payload.managerId || null,
      name: normalizedName,
      description: payload.description || null,
      status: normalizeStatus(payload.status) || 'ACTIVE',
      priority: normalizePriority(payload.priority) || 'MEDIUM',
      progress: Number(payload.progress || 0),
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      deadline: payload.deadline ? new Date(payload.deadline) : null,
      isArchived: false,
    },
    select: { id: true, workspaceId: true },
  });

  if (payload.memberIds !== undefined) {
    await syncProjectMembers(
      prisma,
      workspaceId,
      createdProject.id,
      payload.memberIds,
    );
  }

  return prisma.project.findFirst({
    where: { id: createdProject.id, workspaceId },
    select: PROJECT_SELECT,
  });
};

const listProjects = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;

  const where = { workspaceId, isArchived: false };
  const status = String(options.status || '')
    .trim()
    .toUpperCase();
  const priority = String(options.priority || '')
    .trim()
    .toUpperCase();
  const search = String(options.search || '').trim();
  const userRole = String(options.userRole || '').toUpperCase();
  const userId = String(options.userId || '').trim();

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (userRole === 'EMPLOYEE' && userId) {
    where.OR = [
      { managerId: userId },
      {
        members: {
          some: { userId },
        },
      },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: PROJECT_SELECT,
    }),
    prisma.project.count({ where }),
  ]);

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const getProjectById = async (workspaceId, projectId) => {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: PROJECT_SELECT,
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return project;
};

const updateProject = async (workspaceId, projectId, payload = {}) => {
  const prisma = getPrisma();
  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!existingProject) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};

  if (payload.name !== undefined) {
    const normalizedName = String(payload.name || '').trim();
    if (!normalizedName) {
      const err = new Error('Project name is required.');
      err.statusCode = 400;
      throw err;
    }

    const duplicateProject = await prisma.project.findFirst({
      where: {
        workspaceId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
        NOT: { id: projectId },
      },
    });

    if (duplicateProject) {
      const err = new Error(
        'A project with this name already exists in this workspace.',
      );
      err.statusCode = 409;
      throw err;
    }

    updateData.name = normalizedName;
  }

  if (payload.description !== undefined)
    updateData.description = payload.description || null;
  if (payload.managerId !== undefined)
    updateData.managerId = payload.managerId || null;
  if (payload.status !== undefined)
    updateData.status = normalizeStatus(payload.status) || 'ACTIVE';
  if (payload.priority !== undefined)
    updateData.priority = normalizePriority(payload.priority) || 'MEDIUM';
  if (payload.progress !== undefined)
    updateData.progress = Number(payload.progress || 0);
  if (payload.startDate !== undefined)
    updateData.startDate = payload.startDate
      ? new Date(payload.startDate)
      : null;
  if (payload.deadline !== undefined)
    updateData.deadline = payload.deadline ? new Date(payload.deadline) : null;

  await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    select: { id: true },
  });

  if (payload.memberIds !== undefined) {
    await syncProjectMembers(prisma, workspaceId, projectId, payload.memberIds);
  }

  return prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: PROJECT_SELECT,
  });
};

const archiveProject = async (workspaceId, projectId) => {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { isArchived: true, status: 'COMPLETED' },
    select: PROJECT_SELECT,
  });
};

const updateProjectProgress = async (workspaceId, projectId, progress) => {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { progress: Number(progress || 0) },
    select: PROJECT_SELECT,
  });
};

const addProjectMember = async (workspaceId, projectId, userId) => {
  const prisma = getPrisma();

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, workspaceId },
    select: { id: true },
  });

  if (!user) {
    const err = new Error('User not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const existingMembership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });

  if (existingMembership) {
    return prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: PROJECT_SELECT,
    });
  }

  await prisma.projectMember.create({
    data: { projectId, userId },
  });

  return prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: PROJECT_SELECT,
  });
};

const removeProjectMember = async (workspaceId, projectId, userId) => {
  const prisma = getPrisma();

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  const membership = await prisma.projectMember.findFirst({
    where: { projectId, userId },
  });

  if (!membership) {
    return prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: PROJECT_SELECT,
    });
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  return prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: PROJECT_SELECT,
  });
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  archiveProject,
  updateProjectProgress,
  addProjectMember,
  removeProjectMember,
};
