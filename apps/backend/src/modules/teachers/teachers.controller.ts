import type { ListTeachersQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { teachersService } from './teachers.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const teachersController = {
  async list(req: Request, res: Response) {
    const r = await teachersService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async me(req: Request, res: Response) {
    const r = await teachersService.me(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async getById(req: Request, res: Response) {
    const r = await teachersService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await teachersService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await teachersService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async setActive(req: Request, res: Response) {
    const isActive = Boolean((req.body as { isActive?: boolean }).isActive);
    const r = await teachersService.setActive(req.params.id as string, isActive, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async resetPassword(req: Request, res: Response) {
    const r = await teachersService.resetPassword(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await teachersService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
