import express from 'express';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { handleErrors, HttpError, loadSession, requireJsonForWrites } from './http.js';
import type { PaymentProvider } from './payments/provider.js';
import { authRoutes } from './routes/auth.js';
import { storeRoutes } from './routes/store.js';

/** The API as an Express app, so tests can call it without opening a port. */
export function createApp(db: Db, config: Config, provider: PaymentProvider): express.Express {
  const app = express();
  app.disable('x-powered-by');
  // Behind a reverse proxy (nginx, Render...), take the visitor's address from it.
  app.set('trust proxy', 'loopback');

  app.use(express.json({ limit: '100kb' }));
  app.use(requireJsonForWrites);
  app.use(loadSession(db));

  app.use('/api/auth', authRoutes(db, config));
  app.use('/api', storeRoutes(db, config, provider));

  app.use('/api', () => {
    throw new HttpError(404, 'Not found.');
  });
  app.use(handleErrors);
  return app;
}
