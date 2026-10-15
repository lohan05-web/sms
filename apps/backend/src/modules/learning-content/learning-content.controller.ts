import type { ListLearningContentQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { learningContentService } from './learning-content.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const learningContentController = {
  async list(req: Request, res: Response) {
    const result = await learningContentService.list(
      req.query as unknown as ListLearningContentQuery,
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
    const result = await learningContentService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const result = await learningContentService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: result });
  },
  async update(req: Request, res: Response) {
    const result = await learningContentService.update(
      req.params.id as string,
      req.body,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: result });
  },
  async remove(req: Request, res: Response) {
    const result = await learningContentService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
};
