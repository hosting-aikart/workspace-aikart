'use strict';

/**
 * google.service.js
 *
 * Handles all Google OAuth 2.0 operations:
 *  - Building the OAuth2 client from env vars
 *  - Generating the consent URL
 *  - Exchanging the auth code for tokens
 *  - Persisting tokens in the GoogleAccount table
 *  - Auto-refreshing expired access tokens
 *  - Disconnecting (deleting stored tokens)
 *
 * All functions throw descriptive errors that controllers catch and turn into
 * sendError responses. The server starts fine with empty env vars; errors only
 * surface when a feature is actually used.
 */

const { google } = require('googleapis');
const { getPrisma } = require('../../config/prisma');

// ─── Scopes ───────────────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ─── OAuth2 Client Factory ────────────────────────────────────────────────────

/**
 * Creates a bare OAuth2 client using credentials from process.env.
 * Throws a clear error if the env vars are not set so every downstream
 * caller gets a meaningful message rather than a cryptic googleapis error.
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('Google OAuth is not configured. Ask your administrator to set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
    err.statusCode = 503;
    throw err;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Returns the Google OAuth consent URL.
 * @param {string} userId - stored in `state` param so callback knows who to link
 */
function getAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: userId,
  });
}

/**
 * Exchanges an auth code for tokens, fetches the user's Google email,
 * and upserts the GoogleAccount row.
 *
 * @param {string} code   - from the ?code= query param
 * @param {string} userId - from the ?state= query param (set during getAuthUrl)
 */
async function handleCallback(code, userId) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Fetch the Google account email
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2Api.userinfo.get();
  const googleEmail = userInfo.email;

  const prisma = getPrisma();

  await prisma.googleAccount.upsert({
    where: { userId },
    create: {
      userId,
      googleEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope || null,
    },
    update: {
      googleEmail,
      accessToken: tokens.access_token,
      // Only overwrite refreshToken if Google provided a new one.
      // On subsequent connects without prompt=consent Google may omit it.
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope || null,
    },
  });

  return googleEmail;
}

/**
 * Builds an authenticated OAuth2 client for a user, loading their stored tokens
 * and auto-refreshing + persisting if the access token is expired.
 *
 * @param {string} userId
 * @returns {Promise<google.auth.OAuth2>}
 */
async function getAuthorizedClientForUser(userId) {
  const prisma = getPrisma();
  const account = await prisma.googleAccount.findUnique({ where: { userId } });

  if (!account) {
    const err = new Error('Google account not connected. Please connect your Google account first.');
    err.statusCode = 400;
    throw err;
  }

  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate ? account.expiryDate.getTime() : null,
    scope: account.scope,
  });

  // Listen for token refresh events so we can persist the new access token
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      await prisma.googleAccount.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token || account.accessToken,
          ...(newTokens.refresh_token ? { refreshToken: newTokens.refresh_token } : {}),
          expiryDate: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        },
      });
    } catch (e) {
      console.error('[google.service] Failed to persist refreshed token:', e.message);
    }
  });

  return oauth2Client;
}

/**
 * Returns the Google connection status for a user.
 * @param {string} userId
 * @returns {{ connected: boolean, googleEmail: string|null }}
 */
async function getGoogleStatus(userId) {
  const prisma = getPrisma();
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  return {
    connected: !!account,
    googleEmail: account?.googleEmail ?? null,
  };
}

/**
 * Deletes the stored GoogleAccount row for a user (disconnect).
 * @param {string} userId
 */
async function disconnectGoogle(userId) {
  const prisma = getPrisma();
  await prisma.googleAccount.deleteMany({ where: { userId } });
}

module.exports = {
  getAuthUrl,
  handleCallback,
  getAuthorizedClientForUser,
  getGoogleStatus,
  disconnectGoogle,
};
