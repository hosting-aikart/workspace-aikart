const { loginSchema } = require("./auth.validation");
const { loginUser, getUserById } = require("./auth.service");
const { sendSuccess, sendError } = require("../../utils/apiResponse");

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const data = await loginUser(body.email, body.password);

    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, err.message || "Login failed.", 400);
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
    return sendError(res, err.message || "Failed to fetch user.", 500);
  }
};

/**
 * POST /api/auth/refresh
 * Placeholder — for now returns 501 (not implemented).
 * TODO: Implement refresh-token rotation with httpOnly cookies.
 */
const refresh = async (_req, res) => {
  return sendError(res, "Token refresh not yet implemented.", 501);
};

/**
 * POST /api/auth/logout
 * Clears session state. Currently a no-op on the server side
 * since JWTs are stateless, but the endpoint exists so the
 * client doesn't get a 404.
 */
const logout = async (_req, res) => {
  return sendSuccess(res, { message: "Logged out successfully." });
};

module.exports = { login, getMe, refresh, logout };