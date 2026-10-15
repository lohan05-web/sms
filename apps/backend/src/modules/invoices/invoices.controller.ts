import type { FeeDeskQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { invoicesService } from './invoices.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const invoicesController = {
  async list(req: Request, res: Response) {
    const r = await invoicesService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await invoicesService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await invoicesService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await invoicesService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await invoicesService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async generate(req: Request, res: Response) {
    const r = await invoicesService.generateInvoices(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async feeDesk(req: Request, res: Response) {
    const r = await invoicesService.feeDesk(
      req.query as unknown as FeeDeskQuery,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: r });
  },
};
