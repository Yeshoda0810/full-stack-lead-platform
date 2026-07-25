const { verifyToken, COOKIE_NAME } = require('../lib/auth');

/**
 * Reads the session cookie OR an Authorization: Bearer header (the API
 * accepts either so it's testable with supertest and usable by non-browser
 * clients), verifies it, and attaches `req.user = { id, role, name }`.
 * This is the single point where "who is making this request" is decided -
 * every route below trusts req.user rather than re-deriving identity.
 */
function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[COOKIE_NAME] || bearer;

  if (!token) {
    return res.status(401).json({ error: 'unauthenticated', message: 'No session token provided.' });
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthenticated', message: 'Session token is invalid or expired.' });
  }
}

/**
 * Role gate. Always runs AFTER requireAuth, and always on the server -
 * hiding a button in the UI is not a permission control, this is.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `This action requires role: ${allowedRoles.join(' or ')}.`,
      });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
