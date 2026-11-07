import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../src/auth/passwords.js';
import { sweepOrders } from '../src/store.js';
import { createTestApi } from './helpers.js';

describe('template store', () => {
  let api: Awaited<ReturnType<typeof createTestApi>>;

  beforeEach(async () => {
    api = await createTestApi();
  });

  afterEach(() => api.db.close());

  const owned = async (agent: Awaited<ReturnType<typeof api.signIn>>) =>
    (await agent.get('/api/templates').expect(200)).body.templates
      .filter((template: { owned: boolean }) => template.owned)
      .map((template: { id: string }) => template.id);

  it('lists the catalogue with the free template owned and in use', async () => {
    const agent = await api.signIn();
    const { body } = await agent.get('/api/templates').expect(200);

    expect(body.activeTemplateId).toBe('split');
    expect(body.templates.map((template: { id: string }) => template.id)).toEqual([
      'split',
      'overlay',
      'floral',
      'royal',
      'watercolor',
    ]);
    expect(body.templates[3]).toMatchObject({ id: 'royal', priceCents: 2549, listPriceCents: 2999, owned: false });
    expect(await owned(agent)).toEqual(['split', 'watercolor']);
  });

  it('buys a template, then shows it on the guests’ invitation pages', async () => {
    const agent = await api.signIn();
    // A price sent by the browser is ignored; the server charges the catalogue price.
    const created = await agent.post('/api/orders').send({ templateId: 'royal', amountCents: 1 }).expect(201);
    expect(created.body).toMatchObject({
      reference: expect.stringMatching(/^VW-[0-9A-F]{8}$/),
      templateId: 'royal',
      amountCents: 2549,
      currency: 'USD',
      status: 'pending',
      qrString: expect.stringContaining(created.body.reference),
      testMode: true,
    });

    expect((await agent.get(`/api/orders/${created.body.id}`)).body.status).toBe('pending');
    // Not paid yet: the template cannot be used.
    await agent.put('/api/weddings/current/template').send({ templateId: 'royal' }).expect(403);

    const paid = await agent.post(`/api/orders/${created.body.id}/simulate-payment`).send({}).expect(200);
    expect(paid.body).toMatchObject({ status: 'paid', qrString: null, paidAt: expect.any(String) });
    expect(await owned(agent)).toEqual(['split', 'royal', 'watercolor']);

    await agent.put('/api/weddings/current/template').send({ templateId: 'royal' }).expect(200);
    const invitation = await request(api.app).get('/api/public/invitations/a7d4e2c9f0614b83').expect(200);
    expect(invitation.body).toEqual({ templateId: 'royal' });
  });

  it('refuses to sell a template the wedding already owns', async () => {
    const agent = await api.signIn();
    await agent.post('/api/orders').send({ templateId: 'split' }).expect(409);
    await agent.post('/api/orders').send({ templateId: 'nope' }).expect(404);
  });

  it('lets only the couple and planner buy', async () => {
    const staff = await api.signIn('staff@vows.local', 'vows-staff');
    await staff.post('/api/orders').send({ templateId: 'royal' }).expect(403);
    await staff.get('/api/templates').expect(403);
    await request(api.app).post('/api/orders').send({ templateId: 'royal' }).expect(401);

    const planner = await api.signIn('planner@vows.local', 'vows-planner');
    await planner.post('/api/orders').send({ templateId: 'royal' }).expect(201);
  });

  it('keeps each wedding’s orders private', async () => {
    const couple = await api.signIn();
    const order = (await couple.post('/api/orders').send({ templateId: 'floral' })).body;

    const [other] = await api.db.query<{ id: number }>(
      `INSERT INTO weddings (name) VALUES ('Another wedding') RETURNING id`,
    );
    const [user] = await api.db.query<{ id: number }>(
      `INSERT INTO users (email, name, password_hash) VALUES ('other@vows.local', 'Other', $1) RETURNING id`,
      [await hashPassword('other-pass')],
    );
    await api.db.query(`INSERT INTO wedding_members VALUES ($1, $2, 'couple')`, [other.id, user.id]);
    const stranger = await api.signIn('other@vows.local', 'other-pass');

    await stranger.get(`/api/orders/${order.id}`).expect(404);
    await stranger.post(`/api/orders/${order.id}/simulate-payment`).send({}).expect(404);
  });

  it('holds a payment for review when the amount does not match', async () => {
    const agent = await api.signIn();
    const order = (await agent.post('/api/orders').send({ templateId: 'royal' })).body;
    api.provider.simulatePayment(`sandbox-${order.reference}`, 100, 'USD');

    const checked = await agent.get(`/api/orders/${order.id}`).expect(200);
    expect(checked.body.status).toBe('review');
    expect(await owned(agent)).toEqual(['split', 'watercolor']);
    const [event] = await api.db.query<{ kind: string }>(
      'SELECT kind FROM payment_events WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
      [order.id],
    );
    expect(event.kind).toBe('amount-mismatch');
  });

  it('expires an unpaid order but still accepts a late payment', async () => {
    const agent = await api.signIn();
    const order = (await agent.post('/api/orders').send({ templateId: 'overlay' })).body;
    await api.db.query(`UPDATE orders SET expires_at = now() - interval '5 minutes' WHERE id = $1`, [order.id]);

    const expired = await agent.get(`/api/orders/${order.id}`).expect(200);
    expect(expired.body).toMatchObject({ status: 'expired', qrString: null });

    api.provider.simulatePayment(`sandbox-${order.reference}`, 1299, 'USD');
    await sweepOrders(api.db, api.provider);
    expect((await agent.get(`/api/orders/${order.id}`)).body.status).toBe('paid');
    expect(await owned(agent)).toContain('overlay');
  });

  it('grants a template once even when the payment is seen several times', async () => {
    const agent = await api.signIn();
    const order = (await agent.post('/api/orders').send({ templateId: 'floral' })).body;
    api.provider.simulatePayment(`sandbox-${order.reference}`, 999, 'USD');

    await Promise.all([
      agent.get(`/api/orders/${order.id}`),
      agent.get(`/api/orders/${order.id}`),
      sweepOrders(api.db, api.provider),
    ]);

    const grants = await api.db.query('SELECT 1 FROM entitlements WHERE template_id = $1', ['floral']);
    const paidEvents = await api.db.query(`SELECT 1 FROM payment_events WHERE order_id = $1 AND kind = 'paid'`, [
      order.id,
    ]);
    expect(grants).toHaveLength(1);
    expect(paidEvents).toHaveLength(1);
  });

  it('answers guest pages publicly with only the design, and 404 for unknown links', async () => {
    const response = await request(api.app).get('/api/public/invitations/a7d4e2c9f0614b83').expect(200);
    expect(response.body).toEqual({ templateId: 'split' });
    await request(api.app).get('/api/public/invitations/not-a-token').expect(404);
  });
});
