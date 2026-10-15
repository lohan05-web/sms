import type { Request, Response } from 'express';
import { contactService } from './contact.service';

export const contactController = {
  async create(req: Request, res: Response) {
    const message = await contactService.create(req.body);
    res.status(201).json({
      success: true,
      data: { id: message.id, receivedAt: message.createdAt },
    });
  },
};
