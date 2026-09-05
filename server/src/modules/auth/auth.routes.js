const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth.middleware");
const { authLimiter } = require("../../middleware/rateLimiter");
const { login, getMe, refresh, logout } = require("./auth.controller");

const router = Router();

// Strict limiter — login/refresh are the brute-force/credential-stuffing
// targets; /me and /logout stay on the global limiter only (requireAuth
// already gates /me, and logout has nothing worth brute-forcing).
router.post("/login", authLimiter, login);
router.get("/me", requireAuth, getMe);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);

module.exports = router;