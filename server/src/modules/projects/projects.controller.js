const { z } = require('zod');
const projectsService = require('./projects.service');

const createProjectSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    deadline: z.string().datetime().optional().or(z.null()),
    repositoryLink: z.string().url().optional().or(z.null())
});

const updateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().or(z.null()),
    deadline: z.string().datetime().optional().or(z.null()),
    repositoryLink: z.string().url().optional().or(z.null()),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
    progress: z.number().min(0).max(100).optional()
});

const addMemberSchema = z.object({
    userId: z.string().min(1, "userId is required")
});

const createProjectHandler = async (req, res) => {
    try {
        const payload = createProjectSchema.parse(req.body);
        const project = await projectsService.createProject(req.user.workspaceId, req.user.id, payload);
        res.status(201).json({ status: 'success', data: project });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ status: 'error', message: error.errors[0].message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getProjectsHandler = async (req, res) => {
    try {
        const projects = await projectsService.getProjects(req.user.workspaceId);
        res.json({ status: 'success', data: projects });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const getProjectHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectsService.getProjectById(req.user.workspaceId, id);
        
        if (!project) {
            return res.status(404).json({ status: 'error', message: 'Project not found' });
        }
        
        res.json({ status: 'success', data: project });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const updateProjectHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = updateProjectSchema.parse(req.body);
        
        const project = await projectsService.updateProject(
            req.user.workspaceId, 
            id, 
            req.user.id, 
            req.user.role, 
            payload
        );
        
        res.json({ status: 'success', data: project });
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

const deleteProjectHandler = async (req, res) => {
    try {
        const { id } = req.params;
        
        await projectsService.deleteProject(req.user.workspaceId, id, req.user.id, req.user.role);
        
        res.json({ status: 'success', message: 'Project deleted successfully' });
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

const addMemberHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = addMemberSchema.parse(req.body);
        
        const member = await projectsService.addMember(req.user.workspaceId, id, payload.userId);
        
        res.status(201).json({ status: 'success', data: member });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        if (error.message.includes('already a member')) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ status: 'error', message: error.errors[0].message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const removeMemberHandler = async (req, res) => {
    try {
        const { id, userId } = req.params;
        
        await projectsService.removeMember(req.user.workspaceId, id, userId);
        
        res.json({ status: 'success', message: 'Member removed successfully' });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    createProjectHandler,
    getProjectsHandler,
    getProjectHandler,
    updateProjectHandler,
    deleteProjectHandler,
    addMemberHandler,
    removeMemberHandler
};
