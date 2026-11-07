import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Db } from './db.js';

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

/**
 * Applies the numbered `.sql` files in `migrations/` that have not run yet, each in its own
 * transaction. Files are never edited once released; changes go in a new, higher-numbered file.
 */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const applied = new Set(
    (await db.query<{ name: string }>('SELECT name FROM schema_migrations')).map((row) => row.name),
  );
  const pending = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort();

  for (const file of pending) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
  }
  return pending;
}
