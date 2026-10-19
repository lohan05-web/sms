import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { parentsService } from './parents.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const parentsController = {
  async overview(req: Request, res: Response) {
    const r = await parentsService.overview(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async attendance(req: Request, res: Response) {
    const r = await parentsService.childAttendance(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async results(req: Request, res: Response) {
    const r = await parentsService.childResults(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async homework(req: Request, res: Response) {
    const r = await parentsService.childHomework(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async timetable(req: Request, res: Response) {
    const r = await parentsService.childTimetable(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async invoices(req: Request, res: Response) {
    const r = await parentsService.childInvoices(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async vehicle(req: Request, res: Response) {
    const r = await parentsService.childVehicle(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async syllabus(req: Request, res: Response) {
    const r = await parentsService.childSyllabus(actorFrom(req), req.params.studentId as string);
    res.status(200).json({ success: true, data: r });
  },
  async photo(req: Request, res: Response) {
    const r = await parentsService.childPhoto(
      actorFrom(req),
      req.params.studentId as string,
      (req.body as { photoUrl?: string | null }).photoUrl ?? null,
    );
    res.status(200).json({ success: true, data: r });
  },
};
