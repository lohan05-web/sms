import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { feesService } from './fees.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const feesController = {
  async listCategories(req: Request, res: Response) {
    const r = await feesService.listCategories(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getCategoryById(req: Request, res: Response) {
    const r = await feesService.getCategoryById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async createCategory(req: Request, res: Response) {
    const r = await feesService.createCategory(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async updateCategory(req: Request, res: Response) {
    const r = await feesService.updateCategory(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async removeCategory(req: Request, res: Response) {
    const r = await feesService.removeCategory(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async listStructures(req: Request, res: Response) {
    const r = await feesService.listStructures(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async createStructure(req: Request, res: Response) {
    const r = await feesService.createStructure(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async updateStructure(req: Request, res: Response) {
    const r = await feesService.updateStructure(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async removeStructure(req: Request, res: Response) {
    const r = await feesService.removeStructure(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
