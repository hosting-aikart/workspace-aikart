const { sendSuccess, sendError } = require('../../utils/apiResponse');
const tasksService = require('../tasks/tasks.service');
const {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  archiveProject,
  updateProjectProgress,
  addProjectMember,
  removeProjectMember,
} = require('./project.service');

const createProjectHandler = async (req, res) => {
  try {
    const data = await createProject(req.user.workspaceId, {
      ...req.body,
      createdById: req.user.id,
    });
    return sendSuccess(res, data, 201);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to create project.',
      statusCode,
    );
  }
};

const getProjects = async (req, res) => {
  try {
    const data = await listProjects(req.user.workspaceId, {
      search: req.query.search,
      status: req.query.status,
      priority: req.query.priority,
      page: req.query.page,
      limit: req.query.limit,
      userId: req.user.id,
      userRole: req.user.role,
    });
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch projects.', 500);
  }
};

const getProject = async (req, res) => {
  try {
    const data = await getProjectById(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return sendError(
      res,
      err.message || 'Failed to fetch project.',
      statusCode,
    );
  }
};

const updateProjectHandler = async (req, res) => {
  try {
    const data = await updateProject(
      req.user.workspaceId,
      req.params.id,
      req.body,
      req.user.id,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to update project.',
      statusCode,
    );
  }
};

const archiveProjectHandler = async (req, res) => {
  try {
    const data = await archiveProject(req.user.workspaceId, req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to archive project.',
      statusCode,
    );
  }
};

const progressProjectHandler = async (req, res) => {
  try {
    const data = await updateProjectProgress(
      req.user.workspaceId,
      req.params.id,
      req.body.progress,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to update project progress.',
      statusCode,
    );
  }
};

const addMemberHandler = async (req, res) => {
  try {
    const data = await addProjectMember(
      req.user.workspaceId,
      req.params.id,
      req.body.userId,
      req.user.id,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to add project member.',
      statusCode,
    );
  }
};

const removeMemberHandler = async (req, res) => {
  try {
    const data = await removeProjectMember(
      req.user.workspaceId,
      req.params.id,
      req.params.userId,
    );
    return sendSuccess(res, data);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(
      res,
      err.message || 'Failed to remove project member.',
      statusCode,
    );
  }
};

const getProjectTasksHandler = async (req, res) => {
  try {
    const data = await tasksService.getTasks(
      req.user.workspaceId,
      { projectId: req.params.id },
      req.user.id,
      req.user.role,
    );
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch project tasks.', 500);
  }
};

const createProjectTaskHandler = async (req, res) => {
  try {
    const data = await tasksService.createTask(
      req.user.workspaceId,
      req.user.id,
      req.user.role,
      {
        ...req.body,
        projectId: req.params.id,
      },
    );
    return sendSuccess(res, data, 201);
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return sendError(res, err.message || 'Failed to create task.', statusCode);
  }
};

module.exports = {
  createProjectHandler,
  getProjects,
  getProject,
  updateProjectHandler,
  archiveProjectHandler,
  progressProjectHandler,
  addMemberHandler,
  removeMemberHandler,
  getProjectTasksHandler,
  createProjectTaskHandler,
};
