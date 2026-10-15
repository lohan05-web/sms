import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { vehicleStatsService } from './vehicle-stats.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const vehicleStatsController = {
  async get(req: Request, res: Response) {
    const r = await vehicleStatsService.get(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
