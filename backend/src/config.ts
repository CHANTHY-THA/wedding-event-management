/** Server settings, read once from environment variables. Secrets never live in the code. */
export interface Config {
  port: number;
  /** PostgreSQL connection string. When empty, a local PGlite database in `pgliteDir` is used. */
  databaseUrl: string;
  /** Folder for the local PGlite database; 'memory://' keeps it in memory (tests). */
  pgliteDir: string;
  /** Send cookies only over HTTPS. On in production; off for http://localhost. */
  secureCookies: boolean;
  /** Which payment provider confirms orders. 'sandbox' lets testers mark orders paid. */
  paymentProvider: 'sandbox';
  /** Minutes before an unpaid order and its QR expire. */
  orderTtlMinutes: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env['NODE_ENV'] === 'production';
  return {
    port: Number(env['PORT'] ?? 3000),
    databaseUrl: env['DATABASE_URL'] ?? '',
    pgliteDir: env['PGLITE_DIR'] ?? '.data/pglite',
    secureCookies: env['SECURE_COOKIES'] ? env['SECURE_COOKIES'] === 'true' : production,
    paymentProvider: 'sandbox',
    orderTtlMinutes: Number(env['ORDER_TTL_MINUTES'] ?? 15),
  };
}
