import { createContactMessageSchema } from '@smartschool/shared';
import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { contactController } from './contact.controller';

export const contactRouter = Router();

// Public endpoint: the marketing website's contact form. No authentication is
// required, but the general API rate limiter still applies to POST requests.
contactRouter.post(
  '/',
  validate(createContactMessageSchema),
  asyncHandler(contactController.create),
);
