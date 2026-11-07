import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db.js';

export type Role = 'couple' | 'planner' | 'staff' | 'helper';

/** Who is signed in, and the wedding they are working on. */
export interface SessionUser {
  userId: number;
  email: string;
  name: string;
  weddingId: number;
  weddingName: string;
  role: Role;
}

export const SESSION_COOKIE = 'vows_session';
export const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Starts a session and returns the token for the cookie. Only its hash is stored. */
export async function createSession(db: Db, userId: number, weddingId: number): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, wedding_id, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
    [hashToken(token), userId, weddingId, SESSION_DAYS],
  );
  return token;
}

export async function findSession(db: Db, token: string): Promise<SessionUser | null> {
  const [row] = await db.query<SessionUser>(
    `SELECT u.id AS "userId", u.email, u.name, w.id AS "weddingId", w.name AS "weddingName", m.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN weddings w ON w.id = s.wedding_id
       JOIN wedding_members m ON m.wedding_id = s.wedding_id AND m.user_id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return row ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}
