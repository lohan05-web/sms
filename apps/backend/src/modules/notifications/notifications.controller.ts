import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { notificationsService } from './notifications.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const notificationsController = {
  async list(req: Request, res: Response) {
    const r = await notificationsService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async unreadCount(req: Request, res: Response) {
    const r = await notificationsService.unreadCount(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async markRead(req: Request, res: Response) {
    const r = await notificationsService.markRead(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async markAllRead(req: Request, res: Response) {
    const r = await notificationsService.markAllRead(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await notificationsService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await notificationsService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
};
