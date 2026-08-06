'use strict';

const { sendSuccess, sendError } = require('../../utils/apiResponse');
const emailService = require('./email.service');

// ─── Utility: uniform error handler ─────────────────────────────────────────

function handleError(res, err, label) {
  console.error(`[email.controller] ${label}:`, err.message);
  const status = err.statusCode || 500;
  return sendError(res, err.message || 'An unexpected error occurred.', status);
}

// ─── GET /api/email/inbox ────────────────────────────────────────────────────

const getInbox = async (req, res) => {
  try {
    const result = await emailService.listInbox(req.user.id, req.query.pageToken);
    return sendSuccess(res, result);
  } catch (err) {
    return handleError(res, err, 'getInbox');
  }
};

// ─── GET /api/email/sent ─────────────────────────────────────────────────────

const getSent = async (req, res) => {
  try {
    const result = await emailService.listSent(req.user.id, req.query.pageToken);
    return sendSuccess(res, result);
  } catch (err) {
    return handleError(res, err, 'getSent');
  }
};

// ─── GET /api/email/drafts ───────────────────────────────────────────────────

const getDrafts = async (req, res) => {
  try {
    const result = await emailService.listDrafts(req.user.id, req.query.pageToken);
    return sendSuccess(res, result);
  } catch (err) {
    return handleError(res, err, 'getDrafts');
  }
};

// ─── GET /api/email/search?q= ────────────────────────────────────────────────

const searchEmails = async (req, res) => {
  const { q, pageToken } = req.query;
  if (!q || !q.trim()) {
    return sendError(res, 'Search query (q) is required.', 400);
  }
  try {
    const result = await emailService.searchEmails(req.user.id, q, pageToken);
    return sendSuccess(res, result);
  } catch (err) {
    return handleError(res, err, 'searchEmails');
  }
};

// ─── GET /api/email/:messageId ───────────────────────────────────────────────

const getMessageDetail = async (req, res) => {
  try {
    const message = await emailService.getMessage(req.user.id, req.params.messageId);
    return sendSuccess(res, message);
  } catch (err) {
    return handleError(res, err, 'getMessageDetail');
  }
};

// ─── GET /api/email/attachments/:messageId/:attachmentId ─────────────────────

const downloadAttachment = async (req, res) => {
  try {
    const { messageId, attachmentId } = req.params;
    const attachment = await emailService.getAttachment(req.user.id, messageId, attachmentId);

    // Convert base64url → Buffer and stream to client
    const buf = Buffer.from(
      attachment.data.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buf.length);
    return res.end(buf);
  } catch (err) {
    return handleError(res, err, 'downloadAttachment');
  }
};

// ─── POST /api/email/send ────────────────────────────────────────────────────

const sendEmail = async (req, res) => {
  const { to, cc, bcc, subject, body } = req.body;
  if (!to) return sendError(res, '"to" is required.', 400);

  try {
    const result = await emailService.sendEmail(req.user.id, {
      to,
      cc,
      bcc,
      subject,
      body,
      files: req.files || [],
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleError(res, err, 'sendEmail');
  }
};

// ─── POST /api/email/reply/:messageId ───────────────────────────────────────

const replyEmail = async (req, res) => {
  const { body } = req.body;
  try {
    const result = await emailService.replyEmail(req.user.id, req.params.messageId, {
      body,
      files: req.files || [],
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleError(res, err, 'replyEmail');
  }
};

// ─── POST /api/email/forward/:messageId ─────────────────────────────────────

const forwardEmail = async (req, res) => {
  const { to, body } = req.body;
  if (!to) return sendError(res, '"to" is required for forwarding.', 400);
  try {
    const result = await emailService.forwardEmail(req.user.id, req.params.messageId, {
      to,
      body,
      files: req.files || [],
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleError(res, err, 'forwardEmail');
  }
};

// ─── POST /api/email/draft ───────────────────────────────────────────────────

const saveDraft = async (req, res) => {
  const { draftId, to, cc, bcc, subject, body } = req.body;
  try {
    const result = await emailService.saveDraft(req.user.id, {
      draftId,
      to,
      cc,
      bcc,
      subject,
      body,
      files: req.files || [],
    });
    return sendSuccess(res, result, 201);
  } catch (err) {
    return handleError(res, err, 'saveDraft');
  }
};

module.exports = {
  getInbox,
  getSent,
  getDrafts,
  searchEmails,
  getMessageDetail,
  downloadAttachment,
  sendEmail,
  replyEmail,
  forwardEmail,
  saveDraft,
};
