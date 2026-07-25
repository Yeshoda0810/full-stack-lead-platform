const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { newId } = require('../lib/ids');

const VALID_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

function logActivity(db, { leadId, actorId = null, action, meta = null }) {
  db.prepare(
    `INSERT INTO activities (id, lead_id, actor_id, action, meta) VALUES (?, ?, ?, ?, ?)`
  ).run(newId('act'), leadId, actorId, action, meta ? JSON.stringify(meta) : null);
}

function serializeLead(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    message: row.message,
    source: row.source,
    status: row.status,
    assignedToId: row.assigned_to_id,
    assignedToName: row.assigned_to_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function leadsRoutes(db) {
  const router = express.Router();

  // ---- Public capture form: no auth required, deliberately minimal fields ----
  router.post('/public', (req, res) => {
    const { name, email, company, message } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'bad_request', message: 'name and email are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'bad_request', message: 'email is not a valid address.' });
    }

    const id = newId('lead');
    db.prepare(
      `INSERT INTO leads (id, name, email, company, message, source, status)
       VALUES (?, ?, ?, ?, ?, 'public_form', 'NEW')`
    ).run(id, name.trim(), email.trim(), company?.trim() || null, message?.trim() || null);

    logActivity(db, { leadId: id, action: 'lead_captured', meta: { source: 'public_form' } });

    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    return res.status(201).json({ lead: serializeLead(row) });
  });

  // ---- List leads: paginated + filterable ----
  router.get('/', requireAuth, (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const { status, assignedTo, q } = req.query;

    const where = [];
    const params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'bad_request', message: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      where.push('l.status = ?');
      params.push(status);
    }
    if (assignedTo === 'me') {
      where.push('l.assigned_to_id = ?');
      params.push(req.user.id);
    } else if (assignedTo === 'unassigned') {
      where.push('l.assigned_to_id IS NULL');
    } else if (assignedTo) {
      where.push('l.assigned_to_id = ?');
      params.push(assignedTo);
    }
    if (q) {
      where.push('(l.name LIKE ? OR l.email LIKE ? OR l.company LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM leads l ${whereSql}`)
      .get(...params).count;

    const rows = db
      .prepare(
        `SELECT l.*, u.name AS assigned_to_name
         FROM leads l
         LEFT JOIN users u ON u.id = l.assigned_to_id
         ${whereSql}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize);

    res.json({
      leads: rows.map(serializeLead),
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  });

  // ---- Lead detail: includes notes + activity trail ----
  router.get('/:id', requireAuth, (req, res) => {
    const row = db
      .prepare(
        `SELECT l.*, u.name AS assigned_to_name FROM leads l
         LEFT JOIN users u ON u.id = l.assigned_to_id WHERE l.id = ?`
      )
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found', message: 'Lead not found.' });

    const notes = db
      .prepare(
        `SELECT n.id, n.body, n.created_at AS "createdAt", u.name AS "authorName"
         FROM notes n JOIN users u ON u.id = n.author_id
         WHERE n.lead_id = ? ORDER BY n.created_at ASC`
      )
      .all(req.params.id);

    const activity = db
      .prepare(
        `SELECT a.id, a.action, a.meta, a.created_at AS "createdAt", u.name AS "actorName"
         FROM activities a LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.lead_id = ? ORDER BY a.created_at ASC`
      )
      .all(req.params.id)
      .map((a) => ({ ...a, meta: a.meta ? JSON.parse(a.meta) : null }));

    res.json({ lead: serializeLead(row), notes, activity });
  });

  // ---- Status update ----
  // Permission rule: a MEMBER may move a lead through the pipeline only if
  // it is assigned to them. An ADMIN may update any lead's status. This
  // mirrors how a small sales team actually works - reps own their
  // conversations, managers can intervene on anyone's.
  router.patch('/:id/status', requireAuth, (req, res) => {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'bad_request', message: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'not_found' });

    const isOwner = lead.assigned_to_id === req.user.id;
    if (req.user.role !== 'ADMIN' && !isOwner) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Members can only update the status of leads assigned to them.',
      });
    }

    db.prepare(`UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    logActivity(db, {
      leadId: req.params.id,
      actorId: req.user.id,
      action: 'status_changed',
      meta: { from: lead.status, to: status },
    });

    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    res.json({ lead: serializeLead(updated) });
  });

  // ---- Assignment: ADMIN only ----
  router.patch('/:id/assign', requireAuth, requireRole('ADMIN'), (req, res) => {
    const { assignedToId } = req.body || {};
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'not_found' });

    if (assignedToId) {
      const assignee = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedToId);
      if (!assignee) return res.status(400).json({ error: 'bad_request', message: 'assignedToId does not match a known user.' });
    }

    db.prepare(`UPDATE leads SET assigned_to_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
      assignedToId || null,
      req.params.id
    );
    logActivity(db, {
      leadId: req.params.id,
      actorId: req.user.id,
      action: 'reassigned',
      meta: { from: lead.assigned_to_id, to: assignedToId || null },
    });

    const updated = db
      .prepare(
        `SELECT l.*, u.name AS assigned_to_name FROM leads l
         LEFT JOIN users u ON u.id = l.assigned_to_id WHERE l.id = ?`
      )
      .get(req.params.id);
    res.json({ lead: serializeLead(updated) });
  });

  // ---- Notes: any authenticated user may add a note ----
  router.post('/:id/notes', requireAuth, (req, res) => {
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'bad_request', message: 'body is required.' });
    }
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'not_found' });

    const id = newId('note');
    db.prepare(`INSERT INTO notes (id, lead_id, author_id, body) VALUES (?, ?, ?, ?)`).run(
      id,
      req.params.id,
      req.user.id,
      body.trim()
    );
    logActivity(db, { leadId: req.params.id, actorId: req.user.id, action: 'note_added' });

    const note = db
      .prepare(
        `SELECT n.id, n.body, n.created_at AS "createdAt", u.name AS "authorName"
         FROM notes n JOIN users u ON u.id = n.author_id WHERE n.id = ?`
      )
      .get(id);
    res.status(201).json({ note });
  });

  return router;
}

module.exports = leadsRoutes;
