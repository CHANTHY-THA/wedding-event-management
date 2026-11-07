import { hashPassword } from './auth/passwords.js';
import type { Role } from './auth/sessions.js';
import type { Db } from './db.js';

/** The demo accounts shown on the login page; one per role, all on one wedding. */
export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: Role }[] = [
  { email: 'admin@vows.local', password: 'vows-admin', name: 'Simeng & Chanthy', role: 'couple' },
  { email: 'planner@vows.local', password: 'vows-planner', name: 'Malis Chan', role: 'planner' },
  { email: 'staff@vows.local', password: 'vows-staff', name: 'Door team', role: 'staff' },
  { email: 'helper@vows.local', password: 'vows-helper', name: 'Aunt Sreymom', role: 'helper' },
];

export const DEMO_WEDDING_NAME = 'Simeng & Chanthy';

/** The demo guests' invitation links, matching the planner app's sample guest list. */
export const DEMO_GUESTS: [token: string, name: string][] = [
  ['a7d4e2c9f0614b83', 'Emma & James'],
  ['b19f3a06d5e748c2', 'Sarah Martin'],
  ['c6e24d801a7f49b3', 'The Chen Family'],
  ['d0385b2a9e6147fc', 'David & Lina'],
  ['e7a203f1486d4b95', 'Olivia Chen'],
  ['f51b8c3472d04ea6', 'Noah Wilson'],
  ['016c9a72e53d4fb8', 'Harper & Lucas'],
  ['28d0e54f61a749bc', 'The Miller Family'],
];

/**
 * Adds the demo wedding, accounts and guest links if they are missing. Safe to run more than once.
 * For development and tests only: the passwords are public.
 */
export async function seedDemo(db: Db): Promise<number> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.query<{ id: number }>('SELECT id FROM weddings WHERE name = $1', [
      DEMO_WEDDING_NAME,
    ]);
    const weddingId =
      existing?.id ??
      (
        await tx.query<{ id: number }>('INSERT INTO weddings (name) VALUES ($1) RETURNING id', [
          DEMO_WEDDING_NAME,
        ])
      )[0].id;

    for (const account of DEMO_ACCOUNTS) {
      const [user] = await tx.query<{ id: number }>(
        `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [account.email, account.name, await hashPassword(account.password)],
      );
      await tx.query(
        `INSERT INTO wedding_members (wedding_id, user_id, role) VALUES ($1, $2, $3)
         ON CONFLICT (wedding_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [weddingId, user.id, account.role],
      );
    }
    for (const [token, name] of DEMO_GUESTS) {
      await tx.query(
        `INSERT INTO guests (wedding_id, invitation_token, name) VALUES ($1, $2, $3)
         ON CONFLICT (invitation_token) DO NOTHING`,
        [weddingId, token, name],
      );
    }
    return weddingId;
  });
}
