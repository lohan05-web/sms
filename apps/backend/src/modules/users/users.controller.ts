import type { ListUsersQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from './users.service';
import { usersService } from './users.service';

function actorFrom(req: Request): Actor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    schoolId: req.user!.schoolId,
  };
}

export const usersController = {
  async list(req: Request, res: Response) {
    const result = await usersService.list(req.query as unknown as ListUsersQuery, actorFrom(req));
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
    const user = await usersService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: { user } });
  },

  async create(req: Request, res: Response) {
    const user = await usersService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: { user } });
  },

  async update(req: Request, res: Response) {
    const user = await usersService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: { user } });
  },

  async deactivate(req: Request, res: Response) {
    const user = await usersService.deactivate(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: { user } });
  },
};
