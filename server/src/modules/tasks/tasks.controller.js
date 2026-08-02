const { z } = require('zod');
const tasksService = require('./tasks.service');

const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().or(z.null()),
    projectId: z.string().optional().or(z.null()),
    assignedToId: z.string().optional().or(z.null()),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    dueDate: z.string().datetime().optional().or(z.null())
});

const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().or(z.null()),
    assignedToId: z.string().optional().or(z.null()),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    dueDate: z.string().datetime().optional().or(z.null())
});

const createTaskHandler = async (req, res) => {
    try {
        const payload = createTaskSchema.parse(req.body);
        const task = await tasksService.createTask(req.user.workspaceId, req.user.id, payload);
        res.status(201).json({ status: 'success', data: task });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ status: 'error', message: error.errors[0].message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getTasksHandler = async (req, res) => {
    try {
        const filters = {
            assignedToId: req.query.assignedToId,
            projectId: req.query.projectId,
            status: req.query.status,
            priority: req.query.priority
        };
        
        const tasks = await tasksService.getTasks(req.user.workspaceId, filters, req.user.id);
        res.json({ status: 'success', data: tasks });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getTaskHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const task = await tasksService.getTaskById(req.user.workspaceId, id);
        
        if (!task) {
            return res.status(404).json({ status: 'error', message: 'Task not found' });
        }
        
        res.json({ status: 'success', data: task });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const updateTaskHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = updateTaskSchema.parse(req.body);
        
        const task = await tasksService.updateTask(
            req.user.workspaceId, 
            id, 
            req.user.id, 
            req.user.role, 
            payload
        );
        
        res.json({ status: 'success', data: task });
    } catch (error) {
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ status: 'error', message: error.message });
        }
        if (error.message.includes('not found')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ status: 'error', message: error.errors[0].message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const deleteTaskHandler = async (req, res) => {
    try {
        const { id } = req.params;
        
        await tasksService.deleteTask(req.user.workspaceId, id, req.user.id, req.user.role);
        
        res.json({ status: 'success', message: 'Task deleted successfully' });
    } catch (error) {
        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({ status: 'error', message: error.message });
        }
        if (error.message.includes('not found')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    createTaskHandler,
    getTasksHandler,
    getTaskHandler,
    updateTaskHandler,
    deleteTaskHandler
};
