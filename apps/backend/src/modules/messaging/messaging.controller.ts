import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { messagingService } from './messaging.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const messagingController = {
  async list(req: Request, res: Response) {
    const r = await messagingService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async unreadCount(req: Request, res: Response) {
    const r = await messagingService.unreadCount(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async getById(req: Request, res: Response) {
    const r = await messagingService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async listMessages(req: Request, res: Response) {
    const r = await messagingService.listMessages(
      req.params.id as string,
      req.query as any,
      actorFrom(req),
    );
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async create(req: Request, res: Response) {
    const r = await messagingService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async createForStudents(req: Request, res: Response) {
    const r = await messagingService.createForStudents(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async createForTeacher(req: Request, res: Response) {
    const r = await messagingService.createForTeacher(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async sendMessage(req: Request, res: Response) {
    const r = await messagingService.sendMessage(
      req.params.id as string,
      req.body,
      actorFrom(req),
    );
    res.status(201).json({ success: true, data: r });
  },
  async markRead(req: Request, res: Response) {
    const r = await messagingService.markRead(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await messagingService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
