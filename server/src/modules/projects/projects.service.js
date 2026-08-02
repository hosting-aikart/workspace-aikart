const { getPrisma } = require('../../config/prisma');

const createProject = async (workspaceId, createdById, payload) => {
    const prisma = getPrisma();
    
    // Create the project and automatically add the creator as a project member
    const project = await prisma.project.create({
        data: {
            name: payload.name,
            description: payload.description,
            workspaceId: workspaceId,
            status: 'PLANNING',
            deadline: payload.deadline ? new Date(payload.deadline) : null,
            repositoryLink: payload.repositoryLink,
            createdById: createdById,
            members: {
                create: {
                    userId: createdById,
                }
            }
        },
        include: {
            members: true
        }
    });
    
    return project;
};

const getProjects = async (workspaceId) => {
    const prisma = getPrisma();
    
    const projects = await prisma.project.findMany({
        where: { workspaceId },
        include: {
            _count: {
                select: { members: true, tasks: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    return projects;
};

const getProjectById = async (workspaceId, projectId) => {
    const prisma = getPrisma();
    
    const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, profilePhoto: true }
                    }
                }
            },
            tasks: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    
    return project;
};

const updateProject = async (workspaceId, projectId, userId, userRole, payload) => {
    const prisma = getPrisma();
    
    const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId }
    });
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    // Authorization: Creator, ADMIN, or MANAGER
    if (project.createdById !== userId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        throw new Error('Unauthorized to update this project');
    }
    
    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.deadline !== undefined) updateData.deadline = payload.deadline ? new Date(payload.deadline) : null;
    if (payload.progress !== undefined) updateData.progress = payload.progress;
    if (payload.repositoryLink !== undefined) updateData.repositoryLink = payload.repositoryLink;
    
    const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: updateData
    });
    
    return updatedProject;
};

const deleteProject = async (workspaceId, projectId, userId, userRole) => {
    const prisma = getPrisma();
    
    const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId }
    });
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    // Authorization: Creator or ADMIN
    if (project.createdById !== userId && userRole !== 'ADMIN') {
        throw new Error('Unauthorized to delete this project');
    }
    
    // Prisma will handle cascading deletes if set up, otherwise we might need to delete members/tasks first
    // Let's delete members and tasks explicitly just in case CASCADE isn't on relations
    await prisma.$transaction([
        prisma.task.deleteMany({ where: { projectId: projectId } }),
        prisma.projectMember.deleteMany({ where: { projectId: projectId } }),
        prisma.project.delete({ where: { id: projectId } })
    ]);
    
    return true;
};

const addMember = async (workspaceId, projectId, newUserId) => {
    const prisma = getPrisma();
    
    const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId }
    });
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    const user = await prisma.user.findFirst({
        where: { id: newUserId, workspaceId }
    });
    
    if (!user) {
        throw new Error('User not found in this workspace');
    }
    
    const existingMember = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId: newUserId }
        }
    });
    
    if (existingMember) {
        throw new Error('User is already a member of this project');
    }
    
    const member = await prisma.projectMember.create({
        data: {
            projectId,
            userId: newUserId
        },
        include: {
            user: {
                select: { id: true, name: true, email: true, profilePhoto: true }
            }
        }
    });
    
    return member;
};

const removeMember = async (workspaceId, projectId, userIdToRemove) => {
    const prisma = getPrisma();
    
    const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId }
    });
    
    if (!project) {
        throw new Error('Project not found');
    }
    
    const member = await prisma.projectMember.findUnique({
        where: {
            projectId_userId: { projectId, userId: userIdToRemove }
        }
    });
    
    if (!member) {
        throw new Error('Member not found in this project');
    }
    
    await prisma.projectMember.delete({
        where: { id: member.id }
    });
    
    return true;
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember
};
