import type { ListServiceRequestsQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { serviceRequestsService } from './service-requests.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const serviceRequestsController = {
  async list(req: Request, res: Response) {
    const result = await serviceRequestsService.list(
      req.query as unknown as ListServiceRequestsQuery,
      actorFrom(req),
    );
    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  },
  async getById(req: Request, res: Response) {
    const result = await serviceRequestsService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const result = await serviceRequestsService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: result });
  },
  async update(req: Request, res: Response) {
    const result = await serviceRequestsService.update(
      req.params.id as string,
      req.body,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: result });
  },
  async remove(req: Request, res: Response) {
    const result = await serviceRequestsService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async listMine(req: Request, res: Response) {
    const result = await serviceRequestsService.listMine(actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async createMine(req: Request, res: Response) {
    const result = await serviceRequestsService.createMine(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: result });
  },
};
