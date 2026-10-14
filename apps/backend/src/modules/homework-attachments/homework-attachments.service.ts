import type {
  CreateHomeworkAttachmentInput,
  ListHomeworkAttachmentsQuery,
  UpdateHomeworkAttachmentInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const attachmentInclude = {
  homework: {
    select: {
      id: true,
      title: true,
      schoolId: true,
      section: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.HomeworkAttachmentInclude;

async function assertHomeworkInScope(homeworkId: string, scope: string | undefined) {
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    select: { schoolId: true },
  });
  if (!homework) throw ApiError.badRequest('Homework not found');
  if (scope && homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
  return homework;
}

export const homeworkAttachmentsService = {
  async list(query: ListHomeworkAttachmentsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const scope = resolveSchoolScope(actor);
    const where: Prisma.HomeworkAttachmentWhereInput = {};
    if (scope) where.homework = { schoolId: scope };
    if (query.homeworkId) where.homeworkId = query.homeworkId;
    if (query.search) where.name = { contains: query.search };
    const items = await prisma.homeworkAttachment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: attachmentInclude,
    });
    const total = await prisma.homeworkAttachment.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const attachment = await prisma.homeworkAttachment.findUnique({
      where: { id },
      include: attachmentInclude,
    });
    if (!attachment) throw ApiError.notFound('Attachment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && attachment.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return attachment;
  },

  async create(input: CreateHomeworkAttachmentInput, actor: Actor) {
    const scope = resolveSchoolScope(actor);
    await assertHomeworkInScope(input.homeworkId, scope);
    const attachment = await prisma.homeworkAttachment.create({
      data: { homeworkId: input.homeworkId, name: input.name, url: input.url },
      include: attachmentInclude,
    });
    return attachment;
  },

  async update(id: string, input: UpdateHomeworkAttachmentInput, actor: Actor) {
    const existing = await prisma.homeworkAttachment.findUnique({
      where: { id },
      include: { homework: { select: { schoolId: true } } },
    });
    if (!existing) throw ApiError.notFound('Attachment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const attachment = await prisma.homeworkAttachment.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
      },
      include: attachmentInclude,
    });
    return attachment;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.homeworkAttachment.findUnique({
      where: { id },
      include: { homework: { select: { schoolId: true } } },
    });
    if (!existing) throw ApiError.notFound('Attachment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.homework.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.homeworkAttachment.delete({ where: { id } });
    return { success: true };
  },
};
