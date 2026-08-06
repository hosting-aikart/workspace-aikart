const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth.middleware");
const { login, getMe, refresh, logout } = require("./auth.controller");

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.post("/refresh", refresh);
router.post("/logout", logout);

module.exports = router;