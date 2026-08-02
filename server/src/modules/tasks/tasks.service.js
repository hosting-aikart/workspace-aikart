const { getPrisma } = require('../../config/prisma');

const createTask = async (workspaceId, assignedById, payload) => {
    const prisma = getPrisma();
    
    // If projectId is provided, verify it belongs to the same workspace
    if (payload.projectId) {
        const project = await prisma.project.findFirst({
            where: { id: payload.projectId, workspaceId }
        });
        
        if (!project) {
            throw new Error('Project not found in this workspace');
        }
    }
    
    // If assignedToId is provided, verify user belongs to the same workspace
    if (payload.assignedToId) {
        const user = await prisma.user.findFirst({
            where: { id: payload.assignedToId, workspaceId }
        });
        
        if (!user) {
            throw new Error('Assignee not found in this workspace');
        }
    }
    
    const task = await prisma.task.create({
        data: {
            title: payload.title,
            description: payload.description,
            workspaceId: workspaceId,
            projectId: payload.projectId || null,
            assignedToId: payload.assignedToId || null,
            assignedById: assignedById,
            priority: payload.priority || 'MEDIUM',
            status: payload.status || 'PENDING',
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null
        },
        include: {
            assignedTo: {
                select: { id: true, name: true, profilePhoto: true }
            },
            project: {
                select: { id: true, name: true }
            }
        }
    });
    
    return task;
};

const getTasks = async (workspaceId, filters = {}, currentUserId) => {
    const prisma = getPrisma();
    
    const where = { workspaceId };
    
    let hasFilters = false;
    if (filters.assignedToId) {
        where.assignedToId = filters.assignedToId;
        hasFilters = true;
    }
    if (filters.projectId) {
        where.projectId = filters.projectId;
        hasFilters = true;
    }
    if (filters.status) {
        where.status = filters.status;
        hasFilters = true;
    }
    if (filters.priority) {
        where.priority = filters.priority;
        hasFilters = true;
    }
    
    // If no filters provided, default to current user's tasks
    if (!hasFilters) {
        where.assignedToId = currentUserId;
    }
    
    const tasks = await prisma.task.findMany({
        where,
        include: {
            assignedTo: {
                select: { id: true, name: true, profilePhoto: true }
            },
            assignedBy: {
                select: { id: true, name: true, profilePhoto: true }
            },
            project: {
                select: { id: true, name: true }
            }
        },
        orderBy: [
            { status: 'asc' }, // PENDING first, then IN_PROGRESS, COMPLETED
            { dueDate: 'asc' }, // nulls will be sorted depending on DB, but generally works
            { createdAt: 'desc' }
        ]
    });
    
    return tasks;
};

const getTaskById = async (workspaceId, taskId) => {
    const prisma = getPrisma();
    
    const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: {
            assignedTo: {
                select: { id: true, name: true, email: true, profilePhoto: true }
            },
            assignedBy: {
                select: { id: true, name: true, email: true, profilePhoto: true }
            },
            project: {
                select: { id: true, name: true, status: true }
            }
        }
    });
    
    return task;
};

const updateTask = async (workspaceId, taskId, userId, userRole, payload) => {
    const prisma = getPrisma();
    
    const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId }
    });
    
    if (!task) {
        throw new Error('Task not found');
    }
    
    // Authorization: Assignee, Assigner, ADMIN, or MANAGER
    if (task.assignedToId !== userId && task.assignedById !== userId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        throw new Error('Unauthorized to update this task');
    }
    
    // Validate re-assignment
    if (payload.assignedToId && payload.assignedToId !== task.assignedToId) {
        const user = await prisma.user.findFirst({
            where: { id: payload.assignedToId, workspaceId }
        });
        if (!user) {
            throw new Error('Assignee not found in this workspace');
        }
    }
    
    const updateData = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.dueDate !== undefined) updateData.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    if (payload.assignedToId !== undefined) updateData.assignedToId = payload.assignedToId;
    
    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
            assignedTo: {
                select: { id: true, name: true, profilePhoto: true }
            }
        }
    });
    
    return updatedTask;
};

const deleteTask = async (workspaceId, taskId, userId, userRole) => {
    const prisma = getPrisma();
    
    const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId }
    });
    
    if (!task) {
        throw new Error('Task not found');
    }
    
    // Authorization: Assigner, ADMIN, or MANAGER
    if (task.assignedById !== userId && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
        throw new Error('Unauthorized to delete this task');
    }
    
    await prisma.task.delete({
        where: { id: taskId }
    });
    
    return true;
};

module.exports = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask
};
