import { Router, type CookieOptions } from 'express';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import {
  createSession,
  deleteSession,
  findSession,
  SESSION_COOKIE,
  SESSION_DAYS,
  type SessionUser,
} from '../auth/sessions.js';
import { createAttemptLimiter, currentUser, HttpError, readCookie, requireUser } from '../http.js';

/** What the planner app needs to know about the signed-in user. */
export function sessionView(user: SessionUser) {
  return {
    email: user.email,
    name: user.name,
    role: user.role,
    wedding: { id: user.weddingId, name: user.weddingName },
  };
}

// Compared against when the email is unknown, so both cases take about as long.
const missingUserHash = hashPassword('not-a-real-password');

export function authRoutes(db: Db, config: Config): Router {
  const router = Router();
  const limiter = createAttemptLimiter(10, 15 * 60_000);
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    path: '/',
  };

  router.post('/login', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const attemptKey = `${req.ip}|${email}`;
    limiter.check(attemptKey);

    const [user] = await db.query<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [email],
    );
    const valid = await verifyPassword(password, user?.password_hash ?? (await missingUserHash));
    // A user who belongs to no wedding has nothing to open yet.
    const [membership] = user && valid
      ? await db.query<{ wedding_id: number }>(
          'SELECT wedding_id FROM wedding_members WHERE user_id = $1 ORDER BY wedding_id LIMIT 1',
          [user.id],
        )
      : [];
    if (!user || !valid || !membership) {
      limiter.fail(attemptKey);
      throw new HttpError(401, 'That email and password do not match.');
    }
    limiter.reset(attemptKey);

    const token = await createSession(db, user.id, membership.wedding_id);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 86_400_000 });
    res.json(sessionView((await findSession(db, token))!));
  });

  router.post('/logout', async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      await deleteSession(db, token);
    }
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireUser(), (_req, res) => {
    res.json(sessionView(currentUser(res)!));
  });

  return router;
}
