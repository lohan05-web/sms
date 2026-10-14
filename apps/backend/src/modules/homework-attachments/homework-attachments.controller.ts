import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { homeworkAttachmentsService } from './homework-attachments.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const homeworkAttachmentsController = {
  async list(req: Request, res: Response) {
    const r = await homeworkAttachmentsService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await homeworkAttachmentsService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await homeworkAttachmentsService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await homeworkAttachmentsService.update(
      req.params.id as string,
      req.body,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await homeworkAttachmentsService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
