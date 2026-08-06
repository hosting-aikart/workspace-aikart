'use strict';

const { Router } = require('express');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./email.controller');

const router = Router();

// ─── Multer — in-memory, all file types, 25 MB limit ────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

// Wrapper so multer errors surface as JSON, not raw Express errors
const withFiles = (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(413).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// All email routes require authentication
router.use(requireAuth);

// ─── IMPORTANT: specific named paths must come BEFORE /:messageId ───────────

// List folders
router.get('/inbox',  controller.getInbox);
router.get('/sent',   controller.getSent);
router.get('/drafts', controller.getDrafts);

// Search  GET /api/email/search?q=...
router.get('/search', controller.searchEmails);

// Download attachment  GET /api/email/attachments/:messageId/:attachmentId
router.get('/attachments/:messageId/:attachmentId', controller.downloadAttachment);

// Compose / send
router.post('/send', withFiles, controller.sendEmail);

// Reply to a message
router.post('/reply/:messageId', withFiles, controller.replyEmail);

// Forward a message
router.post('/forward/:messageId', withFiles, controller.forwardEmail);

// Create / update draft
router.post('/draft', withFiles, controller.saveDraft);

// Single message detail — MUST be last (catch-all param)
router.get('/:messageId', controller.getMessageDetail);

module.exports = router;
