// config/env.js
// Single source of truth for configuration. Nothing here is a secret value -
// it's a description of which environment variables are required. Actual
// values live in the host's environment / secret manager, never in git.

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  mail: {
    user: () => required('MAIL_USER'),
    pass: () => required('MAIL_PASS'),
  },
  db: {
    url: () => required('DATABASE_URL'),
  },
};
