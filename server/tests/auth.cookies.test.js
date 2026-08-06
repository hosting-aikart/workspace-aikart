const test = require('node:test');
const assert = require('node:assert/strict');
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require('../src/modules/auth/auth.cookies');

test('setRefreshTokenCookie writes an httpOnly refresh cookie', () => {
  const cookies = [];
  const res = {
    cookie(name, value, options) {
      cookies.push({ name, value, options });
    },
  };

  setRefreshTokenCookie(res, 'refresh-token-value');

  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, 'refreshToken');
  assert.equal(cookies[0].value, 'refresh-token-value');
  assert.equal(cookies[0].options.httpOnly, true);
  assert.equal(cookies[0].options.sameSite, 'lax');
  assert.equal(cookies[0].options.maxAge, 7 * 24 * 60 * 60 * 1000);
});

test('clearRefreshTokenCookie removes the refresh cookie', () => {
  const cookies = [];
  const res = {
    clearCookie(name, options) {
      cookies.push({ name, options });
    },
  };

  clearRefreshTokenCookie(res);

  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, 'refreshToken');
  assert.equal(cookies[0].options.path, '/');
});
