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
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));

authRouter.get('/me', authenticate, asyncHandler(authController.me));
authRouter.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

authRouter.post(
  '/register',
  authenticate,
  requirePermission(Permission.USER_CREATE),
  validate(registerSchema),
  asyncHandler(authController.register),
);
