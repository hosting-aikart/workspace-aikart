'use strict';

const { sendSuccess, sendError } = require('../../utils/apiResponse');
const {
  getAuthUrl,
  handleCallback,
  getGoogleStatus,
  disconnectGoogle,
} = require('./google.service');

// ─── GET /api/google/connect ──────────────────────────────────────────────────

/**
 * Redirects the authenticated user to Google's OAuth consent page.
 */
const connect = (req, res) => {
  try {
    const url = getAuthUrl(req.user.id);
    return res.redirect(url);
  } catch (err) {
    console.error('[google.controller] connect:', err.message);
    return sendError(res, err.message, err.statusCode || 500);
  }
};

// ─── GET /api/google/callback ─────────────────────────────────────────────────

/**
 * OAuth callback: exchanges the code for tokens, stores them, and redirects the
 * browser back to the client email page.
 */
const callback = async (req, res) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    // User denied access or another OAuth error
    const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/app/email?google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return sendError(res, 'Invalid OAuth callback parameters.', 400);
  }

  try {
    await handleCallback(code, userId);
    const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/app/email?google_connected=1`);
  } catch (err) {
    console.error('[google.controller] callback:', err.message);
    const clientUrl = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/app/email?google_error=${encodeURIComponent(err.message)}`);
  }
};

// ─── GET /api/google/status ───────────────────────────────────────────────────

/**
 * Returns whether the current user has a connected Google account.
 */
const status = async (req, res) => {
  try {
    const result = await getGoogleStatus(req.user.id);
    return sendSuccess(res, result);
  } catch (err) {
    console.error('[google.controller] status:', err.message);
    return sendError(res, err.message, err.statusCode || 500);
  }
};

// ─── POST /api/google/disconnect ──────────────────────────────────────────────

/**
 * Removes the stored Google tokens for the current user.
 */
const disconnect = async (req, res) => {
  try {
    await disconnectGoogle(req.user.id);
    return sendSuccess(res, { message: 'Google account disconnected.' });
  } catch (err) {
    console.error('[google.controller] disconnect:', err.message);
    return sendError(res, err.message, err.statusCode || 500);
  }
};

module.exports = { connect, callback, status, disconnect };
