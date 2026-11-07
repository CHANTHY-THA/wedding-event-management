import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { connect } from '../src/db.js';
import { migrate } from '../src/migrate.js';
import { SandboxProvider } from '../src/payments/sandbox.js';
import { seedDemo } from '../src/seed.js';

/** A fresh in-memory database with the demo wedding, and the API on top of it. */
export async function createTestApi() {
  const config = { ...loadConfig({}), pgliteDir: 'memory://' };
  const db = await connect(config);
  await migrate(db);
  await seedDemo(db);
  const provider = new SandboxProvider();
  const app = createApp(db, config, provider);

  /** A client that keeps cookies between requests, signed in as `email`. */
  const signIn = async (email = 'admin@vows.local', password = 'vows-admin') => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password }).expect(200);
    return agent;
  };

  return { app, db, config, provider, signIn };
}
