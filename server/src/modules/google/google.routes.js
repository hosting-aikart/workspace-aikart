'use strict';

const { Router } = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { verifyToken } = require('../../utils/jwt');
const { sendError } = require('../../utils/apiResponse');
const { connect, getConnectUrl, callback, status, disconnect } = require('./google.controller');

const router = Router();

// Returns JSON containing the Google OAuth URL (clean SPA approach)
router.get('/connect-url', requireAuth, getConnectUrl);

/**
 * For the /connect endpoint the browser navigates directly (window.location.href),
 * so the Authorization header cannot be set. We accept the Bearer token via the
 * ?token= query param as a fallback, attaching it as a proper header so
 * requireAuth can verify it normally.
 */
const injectTokenFromQuery = (req, _res, next) => {
  if (!req.headers['authorization'] && req.query.token) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
};

// Redirect user to Google's OAuth consent page
router.get('/connect', injectTokenFromQuery, requireAuth, connect);

// Google redirects here with ?code=...&state=userId
// No requireAuth — the session link is carried via the OAuth `state` param
router.get('/callback', callback);

// Returns { connected: boolean, googleEmail: string|null }
router.get('/status', requireAuth, status);

// Removes stored tokens for the current user
router.post('/disconnect', requireAuth, disconnect);

module.exports = router;

