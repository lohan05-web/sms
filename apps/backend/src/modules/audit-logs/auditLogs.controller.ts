import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { auditLogsService } from './auditLogs.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const auditLogsController = {
  async list(req: Request, res: Response) {
    const r = await auditLogsService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await auditLogsService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
