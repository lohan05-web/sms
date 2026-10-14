import {
  Permission,
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { authRateLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(authController.login));
authRouter.post(
  '/login/admin',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.loginAdmin),
);
authRouter.post(
  '/login/teacher',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.loginTeacher),
);
authRouter.post(
  '/login/parent',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.loginParent),
);
authRouter.post(
  '/refresh',
  authRateLimiter,
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh),
);
authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.get('/me', authenticate, asyncHandler(authController.me));
authRouter.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

authRouter.post(
  '/register',
  authenticate,
  requirePermission(Permission.USER_CREATE),
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);
