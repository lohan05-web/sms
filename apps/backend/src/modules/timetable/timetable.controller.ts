import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { timetableService } from './timetable.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const timetableController = {
  async list(req: Request, res: Response) {
    const r = await timetableService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await timetableService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await timetableService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async importTimetable(req: Request, res: Response) {
    const r = await timetableService.import(req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await timetableService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await timetableService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
