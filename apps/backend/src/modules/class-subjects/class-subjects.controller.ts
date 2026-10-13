import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { classSubjectsService } from './class-subjects.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const classSubjectsController = {
  async list(req: Request, res: Response) {
    const r = await classSubjectsService.list(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await classSubjectsService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await classSubjectsService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
