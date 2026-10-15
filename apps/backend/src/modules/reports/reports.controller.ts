import type {
  JoiningReportQuery,
  ReportCardQuery,
  UniversityDashboardQuery,
} from '@smartschool/shared';
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
  async joinings(req: Request, res: Response) {
    const r = await reportsService.joinings(req.query as unknown as JoiningReportQuery, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async reportCards(req: Request, res: Response) {
    const r = await reportsService.reportCards(
      req.query as unknown as ReportCardQuery,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: r });
  },
  async university(req: Request, res: Response) {
    const r = await reportsService.university(
      req.query as unknown as UniversityDashboardQuery,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: r });
  },
};
