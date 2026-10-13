import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
