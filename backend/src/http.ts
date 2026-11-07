import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { findSession, SESSION_COOKIE, type Role, type SessionUser } from './auth/sessions.js';
import type { Db } from './db.js';

/** An error with an HTTP status and a message that is safe to show the user. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return undefined;
}

/** The signed-in user loaded by `loadSession`, or null. */
export function currentUser(res: Response): SessionUser | null {
  return (res.locals['user'] as SessionUser | undefined) ?? null;
}

export function loadSession(db: Db): RequestHandler {
  return async (req, res, next) => {
    const token = readCookie(req, SESSION_COOKIE);
    res.locals['user'] = token ? await findSession(db, token) : null;
    next();
  };
}

/** Signed-in users only, optionally limited to some roles. */
export function requireUser(...roles: Role[]): RequestHandler {
  return (_req, res, next) => {
    const user = currentUser(res);
    if (!user) {
      throw new HttpError(401, 'Please sign in.');
    }
    if (roles.length && !roles.includes(user.role)) {
      throw new HttpError(403, 'Your role cannot do this.');
    }
    next();
  };
}

/**
 * Changes must be sent as JSON. Browsers cannot send a cross-site JSON request without asking
 * the server first (CORS), so this blocks forged form posts that would ride on the cookie.
 */
export function requireJsonForWrites(req: Request, _res: Response, next: NextFunction): void {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !req.is('application/json')) {
    throw new HttpError(415, 'Send the request as JSON.');
  }
  next();
}

export const handleErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  // express.json() reports bad JSON with a status of its own.
  const status = (error as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: 'The request could not be read.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};

/**
 * Counts failed attempts per key (e.g. address + email) and refuses more than `max` within
 * `windowMs`. In memory, so it resets on restart and is per server; move it to the database
 * or Redis when running several servers.
 */
export function createAttemptLimiter(max: number, windowMs: number) {
  const failures = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): void {
      const entry = failures.get(key);
      if (entry && entry.resetAt > Date.now() && entry.count >= max) {
        throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
      }
    },
    fail(key: string): void {
      const entry = failures.get(key);
      if (!entry || entry.resetAt <= Date.now()) {
        failures.set(key, { count: 1, resetAt: Date.now() + windowMs });
      } else {
        entry.count++;
      }
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
