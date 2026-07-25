/**
 * Data layer.
 *
 * Uses Node's built-in `node:sqlite` module (stable enough for this scope,
 * zero native compilation, ships with Node 22+). The schema is plain SQL on
 * purpose: every query in the codebase is visible and auditable rather than
 * hidden behind ORM magic, and swapping the engine later (see README ->
 * "Swapping to Postgres for a multi-instance production deploy") only
 * touches this file plus the four call sites in routes/leads.js.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/dev.db');

function openDb(dbPath = DB_PATH) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'public_form',
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW','CONTACTED','QUALIFIED','WON','LOST')),
  assigned_to_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
`;

function migrate(db) {
  db.exec(SCHEMA);
}

module.exports = { openDb, migrate };
