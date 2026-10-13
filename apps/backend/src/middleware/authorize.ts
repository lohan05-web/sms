import { hasPermission, type Permission, type Role } from '@smartschool/shared';
import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';

/** Allows the request only if the authenticated user has one of the given roles. */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(ApiError.forbidden('Your role is not allowed to perform this action'));
      return;
    }
    next();
  };
}

/** Allows the request only if the user holds every one of the given permissions. */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    const allowed = permissions.every((permission) => hasPermission(req.user!.role, permission));
    if (!allowed) {
      next(ApiError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
