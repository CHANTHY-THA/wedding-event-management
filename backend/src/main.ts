import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connect } from './db.js';
import { migrate } from './migrate.js';
import { createPaymentProvider } from './payments/index.js';
import { sweepOrders } from './store.js';

const config = loadConfig();
const db = await connect(config);
const applied = await migrate(db);
if (applied.length) {
  console.log(`Applied migrations: ${applied.join(', ')}`);
}

const provider = createPaymentProvider(config);
if (provider.testMode) {
  console.warn(`Payments: ${provider.name} (test mode, no real money). Never use this in production.`);
}

const server = createApp(db, config, provider).listen(config.port, () => {
  console.log(`Vows API listening on http://localhost:${config.port}`);
});

// Catch payments that arrive while nobody has the checkout open.
const sweep = setInterval(() => void sweepOrders(db, provider), 30_000);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(sweep);
    server.close(() => void db.close().then(() => process.exit(0)));
  });
}
