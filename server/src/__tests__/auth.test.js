const request = require('supertest');
const { buildTestApp } = require('./helpers');

async function login(app, email, password = 'pw') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

describe('authentication', () => {
  test('rejects login with wrong password', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'nope' });
    expect(res.status).toBe(401);
  });

  test('rejects login for unknown email with the same generic message', async () => {
    const { app } = buildTestApp();
    const badPw = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'nope' });
    const badEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'nope' });
    expect(badPw.body.message).toBe(badEmail.body.message);
  });

  test('accepts correct credentials and returns a usable token', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
  });

  test('rejects any protected route with no token', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  test('rejects a tampered token', async () => {
    const { app } = buildTestApp();
    const token = await login(app, 'admin@test.dev');
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${token.slice(0, -3)}xyz`);
    expect(res.status).toBe(401);
  });
});

describe('role permissions', () => {
  test('MEMBER cannot assign a lead (ADMIN-only route)', async () => {
    const { app, ids } = buildTestApp();
    const memberToken = await login(app, 'member@test.dev');

    const capture = await request(app)
      .post('/api/leads/public')
      .send({ name: 'Lead X', email: 'x@example.com' });
    const leadId = capture.body.lead.id;

    const res = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ assignedToId: ids.memberId });

    expect(res.status).toBe(403);
  });

  test('ADMIN can assign a lead to a member', async () => {
    const { app, ids } = buildTestApp();
    const adminToken = await login(app, 'admin@test.dev');

    const capture = await request(app).post('/api/leads/public').send({ name: 'Lead Y', email: 'y@example.com' });
    const leadId = capture.body.lead.id;

    const res = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: ids.memberId });

    expect(res.status).toBe(200);
    expect(res.body.lead.assignedToId).toBe(ids.memberId);
  });

  test('MEMBER cannot change status on a lead assigned to someone else', async () => {
    const { app, ids } = buildTestApp();
    const adminToken = await login(app, 'admin@test.dev');
    const otherMemberToken = await login(app, 'member2@test.dev');

    const capture = await request(app).post('/api/leads/public').send({ name: 'Lead Z', email: 'z@example.com' });
    const leadId = capture.body.lead.id;
    await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: ids.memberId }); // assigned to memberId, not otherMemberId

    const res = await request(app)
      .patch(`/api/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(403);
  });

  test('MEMBER can change status on a lead assigned to them', async () => {
    const { app, ids } = buildTestApp();
    const adminToken = await login(app, 'admin@test.dev');
    const memberToken = await login(app, 'member@test.dev');

    const capture = await request(app).post('/api/leads/public').send({ name: 'Lead W', email: 'w@example.com' });
    const leadId = capture.body.lead.id;
    await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: ids.memberId });

    const res = await request(app)
      .patch(`/api/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe('CONTACTED');
  });

  test('ADMIN can change status on any lead regardless of assignment', async () => {
    const { app, ids } = buildTestApp();
    const adminToken = await login(app, 'admin@test.dev');

    const capture = await request(app).post('/api/leads/public').send({ name: 'Lead V', email: 'v@example.com' });
    const leadId = capture.body.lead.id;
    await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: ids.memberId });

    const res = await request(app)
      .patch(`/api/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'WON' });

    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe('WON');
  });
});
