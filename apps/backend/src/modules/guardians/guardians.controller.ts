import type { ListGuardiansQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { guardiansService } from './guardians.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const guardiansController = {
  async list(req: Request, res: Response) {
    const r = await guardiansService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await guardiansService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await guardiansService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await guardiansService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await guardiansService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
