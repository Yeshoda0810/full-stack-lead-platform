const request = require('supertest');
const { buildTestApp } = require('./helpers');

describe('core flow: public capture -> assignment -> notes -> activity trail', () => {
  test('a full lead lifecycle is recorded end to end', async () => {
    const { app, ids } = buildTestApp();

    // 1. Public form capture requires no auth.
    const capture = await request(app)
      .post('/api/leads/public')
      .send({ name: 'Jordan Lee', email: 'jordan@example.com', company: 'Example Co', message: 'Interested in a quote' });
    expect(capture.status).toBe(201);
    expect(capture.body.lead.status).toBe('NEW');
    const leadId = capture.body.lead.id;

    // 2. Admin logs in and assigns it.
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'pw' });
    const adminToken = adminLogin.body.token;

    const assign = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedToId: ids.memberId });
    expect(assign.status).toBe(200);
    expect(assign.body.lead.assignedToName).toBe('Member One');

    // 3. The assigned member logs a note and advances the status.
    const memberLogin = await request(app).post('/api/auth/login').send({ email: 'member@test.dev', password: 'pw' });
    const memberToken = memberLogin.body.token;

    const note = await request(app)
      .post(`/api/leads/${leadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'Called, left a voicemail.' });
    expect(note.status).toBe(201);

    const statusUpdate = await request(app)
      .patch(`/api/leads/${leadId}/status`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'CONTACTED' });
    expect(statusUpdate.status).toBe(200);

    // 4. The full trail is visible on the detail endpoint.
    const detail = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.lead.status).toBe('CONTACTED');
    expect(detail.body.notes).toHaveLength(1);
    expect(detail.body.notes[0].body).toBe('Called, left a voicemail.');

    const actions = detail.body.activity.map((a) => a.action);
    expect(actions).toEqual(['lead_captured', 'reassigned', 'note_added', 'status_changed']);
  });

  test('rejects a lead capture missing required fields', async () => {
    const { app } = buildTestApp();
    const res = await request(app).post('/api/leads/public').send({ name: 'No Email' });
    expect(res.status).toBe(400);
  });
});

describe('core flow: paginated, filtered lead list', () => {
  test('filters by status and paginates results', async () => {
    const { app } = buildTestApp();
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'pw' });
    const token = adminLogin.body.token;

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/leads/public').send({ name: `Lead ${i}`, email: `lead${i}@example.com` });
    }
    // Advance one to CONTACTED via admin so status filtering has something to find.
    const list = await request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
    const firstId = list.body.leads[0].id;
    await request(app)
      .patch(`/api/leads/${firstId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONTACTED' });

    const page1 = await request(app)
      .get('/api/leads')
      .query({ page: 1, pageSize: 2 })
      .set('Authorization', `Bearer ${token}`);
    expect(page1.body.leads).toHaveLength(2);
    expect(page1.body.pagination.total).toBe(5);
    expect(page1.body.pagination.totalPages).toBe(3);

    const contacted = await request(app)
      .get('/api/leads')
      .query({ status: 'CONTACTED' })
      .set('Authorization', `Bearer ${token}`);
    expect(contacted.body.leads).toHaveLength(1);
    expect(contacted.body.leads[0].id).toBe(firstId);

    const badStatus = await request(app)
      .get('/api/leads')
      .query({ status: 'NOT_A_STATUS' })
      .set('Authorization', `Bearer ${token}`);
    expect(badStatus.status).toBe(400);
  });
});
