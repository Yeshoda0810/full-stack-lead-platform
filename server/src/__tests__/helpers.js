const { openDb, migrate } = require('../lib/db');
const { createApp } = require('../app');
const { hashPassword } = require('../lib/auth');
const { newId } = require('../lib/ids');

/** Fresh in-memory DB + app per test file/describe block. No shared state, no disk I/O. */
function buildTestApp() {
  const db = openDb(':memory:');
  migrate(db);

  const adminId = newId('user');
  const memberId = newId('user');
  const otherMemberId = newId('user');

  db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)').run(
    adminId, 'admin@test.dev', hashPassword('pw'), 'Admin One', 'ADMIN'
  );
  db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)').run(
    memberId, 'member@test.dev', hashPassword('pw'), 'Member One', 'MEMBER'
  );
  db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?,?,?,?,?)').run(
    otherMemberId, 'member2@test.dev', hashPassword('pw'), 'Member Two', 'MEMBER'
  );

  const app = createApp(db);
  return { app, db, ids: { adminId, memberId, otherMemberId } };
}

module.exports = { buildTestApp };
