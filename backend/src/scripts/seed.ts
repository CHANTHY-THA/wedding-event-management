import { loadConfig } from '../config.js';
import { connect } from '../db.js';
import { migrate } from '../migrate.js';
import { DEMO_ACCOUNTS, seedDemo } from '../seed.js';

if (process.env['NODE_ENV'] === 'production') {
  console.error('Refusing to add demo accounts with public passwords to a production database.');
  process.exit(1);
}

const db = await connect(loadConfig());
await migrate(db);
await seedDemo(db);
console.log(`Demo wedding ready. Accounts: ${DEMO_ACCOUNTS.map((account) => account.email).join(', ')}`);
await db.close();
