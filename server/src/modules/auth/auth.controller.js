const { loginSchema } = require('./auth.validation');
const { loginUser, rotateAccessToken, getUserById } = require('./auth.service');
const { verifyRefreshToken } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const data = await loginUser(body.email, body.password);

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Strip refreshToken from the response payload
    const { refreshToken, ...responseData } = data;
    return sendSuccess(res, responseData);
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
 * Refresh access token using httpOnly refresh token cookie
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return sendError(res, 'No refresh token provided.', 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = await rotateAccessToken(payload.userId);

    return sendSuccess(res, { accessToken: newAccessToken });
  } catch (err) {
    return sendError(res, 'Invalid or expired refresh token.', 401);
  }
};

/**
 * POST /api/auth/logout
 * Clears session state and httpOnly refresh token cookie.
 */
const logout = async (_req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return sendSuccess(res, { message: 'Logged out successfully.' });
};

module.exports = { login, getMe, refresh, logout };
