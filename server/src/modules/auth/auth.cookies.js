const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const setRefreshTokenCookie = (res, token) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/',
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/' });
};

module.exports = {
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
};
