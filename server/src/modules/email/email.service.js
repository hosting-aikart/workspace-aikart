'use strict';

/**
 * email.service.js
 *
 * All Gmail API operations using the googleapis client.
 * Every function calls getAuthorizedClientForUser(userId) first — if the user
 * hasn't connected their Google account, that function throws a clear 400 error
 * which the controller converts into a sendError response.
 *
 * MIME handling is done with plain string building (no external deps) to keep
 * this module dependency-free beyond 'googleapis' which is already installed.
 */

const { google } = require('googleapis');
const { getAuthorizedClientForUser } = require('../google/google.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Base64-URL encode a string (Gmail's raw message format).
 */
function encodeBase64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64-URL encode a Buffer (for binary attachment data).
 */
function encodeBase64UrlBuffer(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Parse Gmail message headers into a plain object.
 */
function parseHeaders(headers = []) {
  const result = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value;
  }
  return result;
}

/**
 * Recursively extract text/html and text/plain parts from a MIME payload tree.
 */
function extractBody(payload) {
  let html = null;
  let plain = null;

  function walk(part) {
    if (!part) return;
    const mime = part.mimeType || '';
    if (mime === 'text/html' && part.body?.data) {
      html = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (mime === 'text/plain' && part.body?.data) {
      plain = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub);
    }
  }

  walk(payload);
  return { html, plain };
}

/**
 * Extract attachment metadata from a MIME payload tree.
 */
function extractAttachmentsMeta(payload) {
  const attachments = [];

  function walk(part) {
    if (!part) return;
    if (
      part.body?.attachmentId &&
      part.filename &&
      part.filename.length > 0
    ) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub);
    }
  }

  walk(payload);
  return attachments;
}

/**
 * Summarise a Gmail message stub into the list-row shape.
 */
function summariseMessage(msg) {
  const headers = parseHeaders(msg.payload?.headers || []);
  const hasAttachment = (msg.payload?.parts || []).some(
    (p) => p.body?.attachmentId
  );
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers['from'] || '',
    subject: headers['subject'] || '(no subject)',
    snippet: msg.snippet || '',
    date: headers['date'] || '',
    unread: (msg.labelIds || []).includes('UNREAD'),
    hasAttachment,
  };
}

/**
 * Build a raw RFC 2822 MIME email with optional file attachments.
 * Returns a base64url-encoded string ready for Gmail API.
 *
 * @param {{
 *   from: string,
 *   to: string,
 *   cc?: string,
 *   bcc?: string,
 *   subject: string,
 *   body: string,
 *   inReplyTo?: string,
 *   references?: string,
 *   threadId?: string,
 *   files?: Array<{originalname: string, mimetype: string, buffer: Buffer}>
 * }} opts
 */
function buildRawMime(opts) {
  const boundary = `----=_Part_${Date.now()}`;
  const lines = [];

  // Headers
  if (opts.from) lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc) lines.push(`Cc: ${opts.cc}`);
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);
  lines.push('MIME-Version: 1.0');

  const hasFiles = opts.files && opts.files.length > 0;

  if (!hasFiles) {
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('');
    lines.push(opts.body || '');
  } else {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('');
    lines.push(opts.body || '');

    for (const file of opts.files) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${file.mimetype}`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-Disposition: attachment; filename="${file.originalname}"`);
      lines.push('');
      // Chunk base64 at 76 chars per line (RFC 2045)
      const b64 = file.buffer.toString('base64');
      for (let i = 0; i < b64.length; i += 76) {
        lines.push(b64.slice(i, i + 76));
      }
    }

    lines.push(`--${boundary}--`);
  }

  return encodeBase64Url(lines.join('\r\n'));
}

// ─── Exported Service Functions ───────────────────────────────────────────────

/**
 * List inbox messages (paginated).
 */
async function listInbox(userId, pageToken) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults: 20,
    ...(pageToken ? { pageToken } : {}),
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) {
    return { messages: [], nextPageToken: null };
  }

  // Fetch metadata for each message in parallel
  const messages = await Promise.all(
    messageIds.map((m) =>
      gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      }).then((r) => summariseMessage(r.data))
    )
  );

  return {
    messages,
    nextPageToken: listRes.data.nextPageToken || null,
  };
}

/**
 * List sent messages (paginated).
 */
async function listSent(userId, pageToken) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['SENT'],
    maxResults: 20,
    ...(pageToken ? { pageToken } : {}),
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) {
    return { messages: [], nextPageToken: null };
  }

  const messages = await Promise.all(
    messageIds.map((m) =>
      gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['To', 'Subject', 'Date'],
      }).then((r) => summariseMessage(r.data))
    )
  );

  return {
    messages,
    nextPageToken: listRes.data.nextPageToken || null,
  };
}

/**
 * List drafts (paginated).
 */
async function listDrafts(userId, pageToken) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.drafts.list({
    userId: 'me',
    maxResults: 20,
    ...(pageToken ? { pageToken } : {}),
  });

  const draftList = listRes.data.drafts || [];
  if (draftList.length === 0) {
    return { drafts: [], nextPageToken: null };
  }

  const drafts = await Promise.all(
    draftList.map((d) =>
      gmail.users.drafts.get({
        userId: 'me',
        id: d.id,
        format: 'metadata',
      }).then((r) => ({
        draftId: r.data.id,
        ...summariseMessage(r.data.message || {}),
      }))
    )
  );

  return {
    drafts,
    nextPageToken: listRes.data.nextPageToken || null,
  };
}

/**
 * Get a single message in full detail.
 */
async function getMessage(userId, messageId) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const msg = res.data;
  const headers = parseHeaders(msg.payload?.headers || []);
  const { html, plain } = extractBody(msg.payload);
  const attachments = extractAttachmentsMeta(msg.payload);

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers['from'] || '',
    to: headers['to'] || '',
    cc: headers['cc'] || '',
    subject: headers['subject'] || '(no subject)',
    date: headers['date'] || '',
    messageId: headers['message-id'] || '',
    references: headers['references'] || '',
    body: html || plain || '',
    bodyType: html ? 'html' : 'plain',
    unread: (msg.labelIds || []).includes('UNREAD'),
    attachments,
    labelIds: msg.labelIds || [],
  };
}

/**
 * Download an attachment (returns base64-encoded data + mimeType).
 */
async function getAttachment(userId, messageId, attachmentId) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  });

  return {
    data: res.data.data, // base64url encoded
    size: res.data.size,
  };
}

/**
 * Send a new email.
 */
async function sendEmail(userId, { to, cc, bcc, subject, body, files }) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  // Get sender's email address
  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const from = profileRes.data.emailAddress;

  const raw = buildRawMime({ from, to, cc, bcc, subject, body, files });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { id: res.data.id, threadId: res.data.threadId };
}

/**
 * Reply to an existing message (preserves thread).
 */
async function replyEmail(userId, messageId, { body, files }) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch the original to get thread context
  const original = await getMessage(userId, messageId);

  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const from = profileRes.data.emailAddress;

  const subject = original.subject.startsWith('Re:')
    ? original.subject
    : `Re: ${original.subject}`;

  const references = original.references
    ? `${original.references} ${original.messageId}`
    : original.messageId;

  const raw = buildRawMime({
    from,
    to: original.from,
    subject,
    body,
    files,
    inReplyTo: original.messageId,
    references,
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      threadId: original.threadId,
    },
  });

  return { id: res.data.id, threadId: res.data.threadId };
}

/**
 * Forward an existing message.
 */
async function forwardEmail(userId, messageId, { to, body, files }) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const original = await getMessage(userId, messageId);

  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const from = profileRes.data.emailAddress;

  const subject = original.subject.startsWith('Fwd:')
    ? original.subject
    : `Fwd: ${original.subject}`;

  // Quote the original body below the composed text
  const originalBodyText =
    original.bodyType === 'html'
      ? `\n\n---------- Forwarded message ----------\n${original.body}`
      : `\n\n---------- Forwarded message ----------\nFrom: ${original.from}\nDate: ${original.date}\nSubject: ${original.subject}\n\n${original.body}`;

  const fullBody = `${body || ''}\n${originalBodyText}`;

  const raw = buildRawMime({
    from,
    to,
    subject,
    body: fullBody,
    files,
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { id: res.data.id, threadId: res.data.threadId };
}

/**
 * Create or update a draft.
 * If draftId is provided → update; otherwise → create.
 */
async function saveDraft(userId, { draftId, to, cc, bcc, subject, body, files }) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const profileRes = await gmail.users.getProfile({ userId: 'me' });
  const from = profileRes.data.emailAddress;

  const raw = buildRawMime({ from, to: to || '', cc, bcc, subject: subject || '', body: body || '', files });

  if (draftId) {
    const res = await gmail.users.drafts.update({
      userId: 'me',
      id: draftId,
      requestBody: { message: { raw } },
    });
    return { draftId: res.data.id };
  } else {
    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw } },
    });
    return { draftId: res.data.id };
  }
}

/**
 * Search emails using Gmail's native query syntax.
 */
async function searchEmails(userId, q, pageToken) {
  const auth = await getAuthorizedClientForUser(userId);
  const gmail = google.gmail({ version: 'v1', auth });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 20,
    ...(pageToken ? { pageToken } : {}),
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) {
    return { messages: [], nextPageToken: null };
  }

  const messages = await Promise.all(
    messageIds.map((m) =>
      gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      }).then((r) => summariseMessage(r.data))
    )
  );

  return {
    messages,
    nextPageToken: listRes.data.nextPageToken || null,
  };
}

module.exports = {
  listInbox,
  listSent,
  listDrafts,
  getMessage,
  getAttachment,
  sendEmail,
  replyEmail,
  forwardEmail,
  saveDraft,
  searchEmails,
};
