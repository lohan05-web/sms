import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { schoolsService } from './schools.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const schoolsController = {
  async list(req: Request, res: Response) {
    const r = await schoolsService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getMine(req: Request, res: Response) {
    const r = await schoolsService.getMine(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async getById(req: Request, res: Response) {
    const r = await schoolsService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await schoolsService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
