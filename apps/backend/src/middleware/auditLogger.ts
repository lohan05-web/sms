import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { writeAudit } from '../lib/audit';

const METHOD_ACTIONS: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

function pathSegments(url: string): string[] {
  const path = url.startsWith(env.API_PREFIX) ? url.slice(env.API_PREFIX.length) : url;
  return path.split('?')[0]!.split('/').filter(Boolean);
}

/**
 * Records every successful mutating request (2xx POST/PUT/PATCH/DELETE) into the
 * audit log. Runs app-wide and reads `req.user` on response finish, so it works
 * regardless of which router handled the request.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const action = METHOD_ACTIONS[req.method];
  if (!action) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const segments = pathSegments(req.originalUrl);
    const entity = segments[0] ?? 'unknown';
    const entityId = [...segments].reverse().find((s) => CUID_PATTERN.test(s)) ?? null;
    const isLogin = entity === 'auth' && segments[1] === 'login' && req.method === 'POST';

    void writeAudit({
      userId: req.user?.id ?? null,
      schoolId: req.user?.schoolId ?? null,
      action: isLogin ? 'LOGIN' : action,
      entity,
      entityId,
      metadata: { method: req.method, path: req.originalUrl, status: res.statusCode },
      ipAddress: req.ip ?? null,
    });
  });

  next();
}
