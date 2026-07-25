const express = require('express');
const { requireAuth } = require('../middleware/auth');

function usersRoutes(db) {
  const router = express.Router();

  // Any authenticated user can see the team list (needed to render "assigned
  // to" names and populate the assign dropdown for admins). Password hashes
  // are never selected here, let alone returned.
  router.get('/', requireAuth, (req, res) => {
    const users = db.prepare('SELECT id, name, email, role FROM users ORDER BY name').all();
    res.json({ users });
  });

  return router;
}

module.exports = usersRoutes;
