import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { reportsService } from './reports.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const reportsController = {
  async dashboard(req: Request, res: Response) {
    const r = await reportsService.dashboard(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async attendance(req: Request, res: Response) {
    const r = await reportsService.attendance(req.query as any, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async fees(req: Request, res: Response) {
    const r = await reportsService.fees(req.query as any, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async enrollment(req: Request, res: Response) {
    const r = await reportsService.enrollment(req.query as any, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
