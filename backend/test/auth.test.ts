import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApi } from './helpers.js';

describe('sign-in', () => {
  let api: Awaited<ReturnType<typeof createTestApi>>;

  beforeAll(async () => {
    api = await createTestApi();
  });

  afterAll(() => api.db.close());

  it('signs in with a demo account and keeps the session in an HttpOnly cookie', async () => {
    const response = await request(api.app)
      .post('/api/auth/login')
      .send({ email: ' Admin@Vows.local ', password: 'vows-admin' })
      .expect(200);

    expect(response.body).toEqual({
      email: 'admin@vows.local',
      name: 'Simeng & Chanthy',
      role: 'couple',
      wedding: { id: expect.any(Number), name: 'Simeng & Chanthy' },
    });
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/^vows_session=[\w-]{43};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('stores only a hash of the session token', async () => {
    const response = await request(api.app)
      .post('/api/auth/login')
      .send({ email: 'planner@vows.local', password: 'vows-planner' });
    const token = String(response.headers['set-cookie']).match(/vows_session=([^;]+)/)![1];
    const stored = await api.db.query('SELECT 1 FROM sessions WHERE token_hash = $1', [token]);
    expect(stored).toEqual([]);
  });

  it('refuses a wrong password without saying whether the email exists', async () => {
    const wrongPassword = await request(api.app)
      .post('/api/auth/login')
      .send({ email: 'staff@vows.local', password: 'nope' })
      .expect(401);
    const unknownEmail = await request(api.app)
      .post('/api/auth/login')
      .send({ email: 'nobody@vows.local', password: 'nope' })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.headers['set-cookie']).toBeUndefined();
  });

  it('returns the current user and signs out', async () => {
    const agent = await api.signIn('helper@vows.local', 'vows-helper');
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.role).toBe('helper');

    await agent.post('/api/auth/logout').send({}).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('rejects writes that are not JSON, so forged form posts cannot use the cookie', async () => {
    await request(api.app)
      .post('/api/auth/login')
      .type('form')
      .send({ email: 'admin@vows.local', password: 'vows-admin' })
      .expect(415);
  });

  it('slows down repeated wrong passwords', async () => {
    const attempt = () =>
      request(api.app).post('/api/auth/login').send({ email: 'admin@vows.local', password: 'x' });
    for (let count = 0; count < 10; count++) {
      expect((await attempt()).status).toBe(401);
    }
    expect((await attempt()).status).toBe(429);
  });
});
