const { loginSchema } = require('./auth.validation');
const { loginUser, getUserById, rotateAccessToken } = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('./auth.cookies');
const { verifyRefreshToken } = require('../../utils/jwt');

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const data = await loginUser(body.email, body.password);

    setRefreshTokenCookie(res, data.refreshToken);

    return sendSuccess(res, {
      accessToken: data.accessToken,
      user: data.user,
    });
  } catch (err) {
    return sendError(res, err.message || 'Login failed.', 400);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch user.', 500);
  }
};

/**
 * POST /api/auth/refresh
 * Validates the refresh token from the httpOnly cookie and issues a new access token.
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is missing.', 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = await rotateAccessToken(payload.userId);

    return sendSuccess(res, { accessToken });
  } catch (err) {
    return sendError(res, err.message || 'Token refresh failed.', 401);
  }
};

/**
 * POST /api/auth/logout
 * Clears session state. Currently a no-op on the server side
 * since JWTs are stateless, but the endpoint exists so the
 * client doesn't get a 404.
 */
const logout = async (_req, res) => {
  clearRefreshTokenCookie(res);
  return sendSuccess(res, { message: 'Logged out successfully.' });
};

module.exports = { login, getMe, refresh, logout };
