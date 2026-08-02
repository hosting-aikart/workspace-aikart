const { sendSuccess, sendError } = require('../../utils/apiResponse');
const {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  archiveProject,
} = require('./project.service');

const createProjectHandler = async (req, res) => {
  try {
    const data = await createProject(req.user.workspaceId, req.body);
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
      page: req.query.page,
      limit: req.query.limit,
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

module.exports = {
  createProjectHandler,
  getProjects,
  getProject,
  updateProjectHandler,
  archiveProjectHandler,
};
