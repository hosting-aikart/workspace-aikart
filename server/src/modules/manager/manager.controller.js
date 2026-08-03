const managerService = require('./manager.service');

const getDashboardHandler = async (req, res) => {
  try {
    const data = await managerService.getTeamDashboard(
      req.user.workspaceId,
      req.user.id,
    );
    return res.json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const getAttendanceHandler = async (req, res) => {
  try {
    const data = await managerService.getTeamAttendance(
      req.user.workspaceId,
      req.user.id,
    );
    return res.json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const getTeamHandler = async (req, res) => {
  try {
    const data = await managerService.getTeamMembers(
      req.user.workspaceId,
      req.user.id,
    );
    return res.json({ status: 'success', data });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateTeamMemberHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await managerService.updateTeamMember(
      req.user.workspaceId,
      req.user.id,
      id,
      req.body,
    );
    return res.json({ status: 'success', data });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getDashboardHandler,
  getAttendanceHandler,
  getTeamHandler,
  updateTeamMemberHandler,
};
