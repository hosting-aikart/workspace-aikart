const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/apiResponse');

/**
 * requireAuth
 * Verifies the JWT access token from the Authorization header.
 * Attaches { id, role, workspaceId } to req.user on success.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, role: payload.role, workspaceId: payload.workspaceId };
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired access token.', 401);
  }
};

/**
 * requireRole
 * RBAC guard — must be used after requireAuth.
 * @param {...string} roles - Allowed roles (e.g. 'ADMIN', 'MANAGER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to access this resource.', 403);
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
