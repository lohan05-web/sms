import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid Authorization header');
    }

    const payload = verifyAccessToken(header.slice(7).trim());
    req.user = {
      id: payload.sub,
      role: payload.role,
      schoolId: payload.schoolId,
    };
    next();
  } catch (error) {
    next(
      error instanceof ApiError ? error : ApiError.unauthorized('Invalid or expired access token'),
    );
  }
}
