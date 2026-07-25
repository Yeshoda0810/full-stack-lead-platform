const express = require('express');
const { verifyPassword, signToken, COOKIE_NAME } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');

function authRoutes(db) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', message: 'email and password are required.' });
    }

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(String(email).toLowerCase().trim());

    // Same generic message whether the email or password was wrong, so the
    // API never confirms which emails have accounts.
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password.' });
    }

    const token = signToken(user);
    res
      .cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
      })
      .json({
        token, // also returned in-body for non-browser / test clients
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME).status(204).send();
  });

  router.get('/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    res.json({ user });
  });

  return router;
}

module.exports = authRoutes;
