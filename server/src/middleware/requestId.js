/**
 * Request ID — assigns a short unique id to every request (reusing an
 * inbound X-Request-Id if a proxy/load balancer already set one, so the id
 * stays consistent across hops instead of being regenerated at each one),
 * exposes it on `req.id` for handlers/error logging to reference, and
 * echoes it back as a response header so a client-reported issue can be
 * traced to its exact server-side log line. No new dependency — Node's
 * built-in crypto.randomUUID() is available since Node 14.17.
 */

const { randomUUID } = require('crypto');

const requestId = (req, res, next) => {
  req.id = req.get('X-Request-Id') || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

module.exports = { requestId };
