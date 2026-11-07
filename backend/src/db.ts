import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';
import type { Config } from './config.js';

/**
 * The few database calls the API needs. PostgreSQL in production (`DATABASE_URL`), or PGlite
 * (PostgreSQL compiled to WebAssembly, nothing to install) on a developer machine and in tests.
 * Both speak the same SQL, with `$1, $2...` parameters.
 */
export interface Db {
  query<T extends object>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Runs SQL that may hold several statements and no parameters (migrations). */
  exec(sql: string): Promise<void>;
  /** Runs `work` in one transaction; any error rolls everything back. */
  transaction<T>(work: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function connect(config: Pick<Config, 'databaseUrl' | 'pgliteDir'>): Promise<Db> {
  return config.databaseUrl ? connectPostgres(config.databaseUrl) : connectPglite(config.pgliteDir);
}

async function connectPglite(dataDir: string): Promise<Db> {
  if (!dataDir.includes('://')) {
    // PGlite creates its own folder but not the folders above it.
    await mkdir(dirname(dataDir), { recursive: true });
  }
  const lite = await PGlite.create(dataDir);
  const wrap = (runner: Pick<PGlite, 'query' | 'exec'>): Db => ({
    async query<T extends object>(sql: string, params: unknown[] = []) {
      return (await runner.query<T>(sql, params)).rows;
    },
    async exec(sql: string) {
      await runner.exec(sql);
    },
    // PGlite runs one transaction at a time, so nested calls reuse the open one.
    transaction: (work) => work(wrap(runner)),
    close: async () => undefined,
  });
  return {
    ...wrap(lite),
    transaction: (work) => lite.transaction((tx) => work(wrap(tx))),
    close: () => lite.close(),
  };
}

async function connectPostgres(connectionString: string): Promise<Db> {
  const pool = new pg.Pool({ connectionString });
  const wrap = (runner: Pick<pg.Pool | pg.PoolClient, 'query'>): Db => ({
    async query<T extends object>(sql: string, params: unknown[] = []) {
      return (await runner.query<T>(sql, params)).rows;
    },
    async exec(sql: string) {
      await runner.query(sql);
    },
    transaction: (work) => work(wrap(runner)),
    close: async () => undefined,
  });
  return {
    ...wrap(pool),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
