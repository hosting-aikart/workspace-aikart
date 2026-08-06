const { Router } = require('express');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
} = require('./profile.controller');

const router = Router();

// ─── Multer — in-memory storage, images only, 5 MB limit ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// ─── Multer error handler ─────────────────────────────────────────────────────
const handleMulterError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'Image must be 5 MB or smaller.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

const { getUsers } = require('../admin/admin.controller');

// ─── Profile Routes ───────────────────────────────────────────────────────────

// GET /api/me/directory — fetch all users in the workspace (for all roles)
router.get('/directory', requireAuth, getUsers);

// GET  /api/me/profile  — fetch logged-in user's full profile
router.get('/profile', requireAuth, getMyProfile);

// PATCH /api/me/profile — update phone / password
router.patch('/profile', requireAuth, updateMyProfile);

// POST /api/me/profile/photo — upload profile photo to Cloudinary
router.post(
  '/profile/photo',
  requireAuth,
  (req, res, next) => upload.single('photo')(req, res, (err) => handleMulterError(err, req, res, next)),
  uploadProfilePhoto
);

module.exports = router;
