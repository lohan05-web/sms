import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const teacherAssignmentsService = {
  async list(actor: Actor) {
    const where: Prisma.TeacherAssignmentWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.teacher = { schoolId };
    return prisma.teacherAssignment.findMany({
      where,
      include: { teacher: true, subject: true, classLevel: true, section: true },
    });
  },
  async create(input: any, actor: Actor) {
    const scope = resolveSchoolScope(actor);
    const ta = await prisma.teacherAssignment.create({ data: input });
    const full = await prisma.teacherAssignment.findUnique({
      where: { id: ta.id },
      include: { teacher: true },
    });
    if (scope && full?.teacher.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return ta;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.teacherAssignment.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!existing) throw ApiError.notFound('Teacher assignment not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.teacher.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.teacherAssignment.delete({ where: { id } });
    return { success: true };
  },
};
