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
      include: {
        teacher: true,
        subject: true,
        section: { include: { classLevel: true } },
        academicYear: true,
      },
    });
  },
  async create(
    input: {
      teacherId: string;
      sectionId: string;
      subjectId: string;
      academicYearId: string;
    },
    actor: Actor,
  ) {
    const scope = resolveSchoolScope(actor);
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: input.teacherId },
      select: { id: true, schoolId: true },
    });
    if (!teacher) throw ApiError.notFound('Teacher not found');
    if (scope && teacher.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.teacherAssignment.create({
      data: {
        teacherId: input.teacherId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        academicYearId: input.academicYearId,
      },
      include: {
        teacher: true,
        subject: true,
        section: { include: { classLevel: true } },
        academicYear: true,
      },
    });
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
