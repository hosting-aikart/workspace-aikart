const { Router } = require('express');
const multer = require('multer');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  listConversationsHandler,
  startDirectConversationHandler,
  createGroupConversationHandler,
  updateConversationNameHandler,
  getMessagesHandler,
  sendMessageHandler,
  sendAttachmentHandler,
  bulkDeleteMessagesHandler,
  forwardMessagesHandler,
  markReadHandler,
  clearMessagesHandler,
  leaveConversationHandler,
} = require('./chat.controller');

const router = Router();

router.use(requireAuth);

// ─── Documents allowed alongside plain images. Kept as a whitelist (rather
// than "anything goes") so the chat can't become a general file dump — just
// the formats colleagues actually share: PDFs, Office docs, text, and zips.
// Matched against MIME type first; browsers occasionally hand multer a
// generic/empty type for these (especially .docx/.xlsx on some OS/browser
// combos, since they're technically zip containers), so the file's
// extension is checked as a fallback rather than rejecting those outright.
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip']);

const isAllowedDocument = (file) => {
  if (DOCUMENT_MIME_TYPES.has(file.mimetype)) return true;
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  return DOCUMENT_EXTENSIONS.has(ext);
};

// ─── Multer — in-memory storage, 10 MB limit (Cloudinary's free-plan cap on
// a single upload regardless of resource type — see profile photo upload
// for the same pattern). Images upload as Cloudinary "image" resources;
// everything else in the whitelist above uploads as "raw" — see
// sendAttachmentHandler in chat.controller.js. ─────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || isAllowedDocument(file)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Send an image, PDF, Word/Excel/PowerPoint file, text file, or ZIP.'));
    }
  },
});

const handleMulterError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ status: 'error', message: 'File must be 10 MB or smaller.' });
    }
    return res.status(400).json({ status: 'error', message: err.message });
  }
  if (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
  next();
};

router.get('/conversations', listConversationsHandler);
router.post('/conversations/direct', startDirectConversationHandler);
router.post('/conversations/group', createGroupConversationHandler);
router.get('/conversations/:id/messages', getMessagesHandler);
router.post('/conversations/:id/messages', sendMessageHandler);
router.post(
  '/conversations/:id/attachments',
  (req, res, next) => upload.single('file')(req, res, (err) => handleMulterError(err, req, res, next)),
  sendAttachmentHandler,
);
router.patch('/conversations/:id/read', markReadHandler);
router.delete('/conversations/:id/messages/bulk', bulkDeleteMessagesHandler);
router.post('/conversations/:id/messages/forward', forwardMessagesHandler);
router.delete('/conversations/:id/messages', clearMessagesHandler);
router.delete('/conversations/:id/participants/me', leaveConversationHandler);
router.patch('/conversations/:id', updateConversationNameHandler);

module.exports = router;
