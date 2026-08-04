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
    let clientUrl = process.env.CLIENT_ORIGIN?.replace(/\/+$/, '');
    let returnTo = req.user.role === 'ADMIN' ? '/admin/email' : '/app/email';

    if (req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        if (!clientUrl) {
          clientUrl = refUrl.origin;
        }
        if (refUrl.pathname && refUrl.pathname !== '/') {
          returnTo = refUrl.pathname;
        }
      } catch (e) {
        // Ignore URL parse errors
      }
    }

    if (!clientUrl) {
      clientUrl = 'http://localhost:5173';
    }

    const stateObj = JSON.stringify({
      userId: req.user.id,
      clientUrl,
      returnTo,
    });

    const url = getAuthUrl(stateObj);
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
  const { code, state, error } = req.query;

  let userId = null;
  let clientUrl = process.env.CLIENT_ORIGIN?.replace(/\/+$/, '') || 'http://localhost:5173';
  let returnTo = '/app/email';

  try {
    const parsedState = JSON.parse(state);
    userId = parsedState.userId;
    if (parsedState.clientUrl) {
      clientUrl = parsedState.clientUrl.replace(/\/+$/, '');
    }
    if (parsedState.returnTo) {
      returnTo = parsedState.returnTo;
    }
  } catch (err) {
    userId = state; // Fallback for legacy state
  }

  if (error) {
    console.error('[google.controller] OAuth error:', error);
    return res.redirect(`${clientUrl}${returnTo}?google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return sendError(res, 'Invalid OAuth callback parameters.', 400);
  }

  try {
    await handleCallback(code, userId);
    return res.redirect(`${clientUrl}${returnTo}?google_connected=1`);
  } catch (err) {
    console.error('[google.controller] callback error:', err.message);
    return res.redirect(`${clientUrl}${returnTo}?google_error=${encodeURIComponent(err.message)}`);
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

// ─── GET /api/google/connect-url ──────────────────────────────────────────────

/**
 * Returns JSON containing the Google OAuth consent URL for single-page applications.
 */
const getConnectUrl = (req, res) => {
  try {
    let clientUrl = process.env.CLIENT_ORIGIN?.replace(/\/+$/, '');
    let returnTo = req.user.role === 'ADMIN' ? '/admin/email' : '/app/email';

    if (req.headers.referer) {
      try {
        const refUrl = new URL(req.headers.referer);
        if (!clientUrl) {
          clientUrl = refUrl.origin;
        }
        if (refUrl.pathname && refUrl.pathname !== '/') {
          returnTo = refUrl.pathname;
        }
      } catch (e) {
        // Ignore URL parse errors
      }
    }

    if (!clientUrl) {
      clientUrl = 'http://localhost:5173';
    }

    const stateObj = JSON.stringify({
      userId: req.user.id,
      clientUrl,
      returnTo,
    });

    const url = getAuthUrl(stateObj);
    return sendSuccess(res, { url });
  } catch (err) {
    console.error('[google.controller] getConnectUrl:', err.message);
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

module.exports = { connect, getConnectUrl, callback, status, disconnect };
