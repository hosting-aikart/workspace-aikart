const prismaModule = require('../../config/prisma');

const getPrisma = () => prismaModule.getPrisma();

const normalizeStatus = (status) => String(status || '').toUpperCase();

const createProject = async (workspaceId, payload) => {
  const prisma = getPrisma();
  const normalizedName = String(payload.name || '').trim();

  if (!normalizedName) {
    const err = new Error('Project name is required.');
    err.statusCode = 400;
    throw err;
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

  return prisma.project.create({
    data: {
      workspaceId,
      name: normalizedName,
      description: payload.description || null,
      deadline: payload.deadline ? new Date(payload.deadline) : null,
      status: normalizeStatus(payload.status) || 'ACTIVE',
      repositoryLink: payload.repositoryLink || null,
      progress: Number(payload.progress || 0),
      isArchived: false,
    },
  });
};

const listProjects = async (workspaceId, options = {}) => {
  const prisma = getPrisma();
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;

  const where = { workspaceId };
  const status = String(options.status || '')
    .trim()
    .toUpperCase();
  const search = String(options.search || '').trim();

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return project;
};

const updateProject = async (workspaceId, projectId, payload) => {
  const prisma = getPrisma();
  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
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
  if (payload.deadline !== undefined)
    updateData.deadline = payload.deadline ? new Date(payload.deadline) : null;
  if (payload.status !== undefined)
    updateData.status = normalizeStatus(payload.status) || 'ACTIVE';
  if (payload.repositoryLink !== undefined)
    updateData.repositoryLink = payload.repositoryLink || null;
  if (payload.progress !== undefined)
    updateData.progress = Number(payload.progress || 0);

  return prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });
};

const archiveProject = async (workspaceId, projectId) => {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    const err = new Error('Project not found in this workspace.');
    err.statusCode = 404;
    throw err;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { isArchived: true, status: 'ARCHIVED' },
  });
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  archiveProject,
};
