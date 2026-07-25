/**
 * Seeds two role accounts (one per required role) plus a few sample leads,
 * so a reviewer can log in immediately and see a populated pipeline.
 * Run with: npm run seed
 */
const { openDb, migrate } = require('./lib/db');
const { hashPassword } = require('./lib/auth');
const { newId } = require('./lib/ids');

function seed() {
  const db = openDb();
  migrate(db);

  const existing = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (existing > 0) {
    console.log('Database already seeded, skipping. Delete data/dev.db to reseed.');
    db.close();
    return;
  }

  const adminId = newId('user');
  const memberId = newId('user');

  db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
  ).run(adminId, 'admin@leadplatform.demo', hashPassword('AdminDemo123!'), 'Ava Admin', 'ADMIN');

  db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
  ).run(memberId, 'member@leadplatform.demo', hashPassword('MemberDemo123!'), 'Max Member', 'MEMBER');

  const sampleLeads = [
    { name: 'Priya Raman', email: 'priya@northwind-retail.com', company: 'Northwind Retail', status: 'NEW', assigned: null },
    { name: 'Tom Okafor', email: 'tom@brightpath.io', company: 'Brightpath', status: 'CONTACTED', assigned: memberId },
    { name: 'Sara Lindqvist', email: 'sara@lindqvist-co.se', company: 'Lindqvist & Co', status: 'QUALIFIED', assigned: memberId },
    { name: 'Diego Fuentes', email: 'diego@fuentesgroup.mx', company: 'Fuentes Group', status: 'WON', assigned: adminId },
  ];

  for (const l of sampleLeads) {
    const id = newId('lead');
    db.prepare(
      `INSERT INTO leads (id, name, email, company, status, assigned_to_id, source) VALUES (?, ?, ?, ?, ?, ?, 'public_form')`
    ).run(id, l.name, l.email, l.company, l.status, l.assigned);
    db.prepare(`INSERT INTO activities (id, lead_id, actor_id, action) VALUES (?, ?, ?, 'lead_captured')`).run(
      newId('act'),
      id,
      null
    );
  }

  console.log('Seeded database with 2 users and 4 sample leads.');
  console.log('  ADMIN  -> admin@leadplatform.demo / AdminDemo123!');
  console.log('  MEMBER -> member@leadplatform.demo / MemberDemo123!');
  db.close();
}

seed();
