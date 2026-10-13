import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const classSubjectsService = {
  async list(actor: Actor) {
    const where: Prisma.ClassSubjectWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.classLevel = { schoolId };
    return prisma.classSubject.findMany({ where, include: { classLevel: true, subject: true } });
  },
  async create(input: any, actor: Actor) {
    const scope = resolveSchoolScope(actor);
    const cs = await prisma.classSubject.create({ data: input });
    const full = await prisma.classSubject.findUnique({
      where: { id: cs.id },
      include: { classLevel: true },
    });
    if (scope && full?.classLevel.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return cs;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.classSubject.findUnique({
      where: { id },
      include: { classLevel: true },
    });
    if (!existing) throw ApiError.notFound('Class subject not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.classLevel.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.classSubject.delete({ where: { id } });
    return { success: true };
  },
};
