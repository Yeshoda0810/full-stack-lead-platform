const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('node:path');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const leadsRoutes = require('./routes/leads');

function createApp(db) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || true,
      credentials: true,
    })
  );

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes(db));
  app.use('/api/users', usersRoutes(db));
  app.use('/api/leads', leadsRoutes(db));

  // Serve the built React client in production (single free-tier service
  // instead of paying for two). See client/README for the build step.
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  // Centralized error handler - malformed JSON bodies, unexpected throws.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'bad_request', message: 'Malformed JSON body.' });
    }
    console.error(err);
    res.status(500).json({ error: 'internal_error', message: 'Something went wrong.' });
  });

  return app;
}

module.exports = { createApp };
