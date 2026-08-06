/**
 * Consistent JSON response helpers for all API routes.
 */

/**
 * @param {import('express').Response} res
 * @param {any} data
 * @param {number} [statusCode=200]
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

/**
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 */
const sendError = (res, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { sendSuccess, sendError };
