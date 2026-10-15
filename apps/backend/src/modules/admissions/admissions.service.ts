import type {
  CreateAdmissionInput,
  ListAdmissionsQuery,
  UpdateAdmissionInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

const DECIDED_STATUSES = new Set(['APPROVED', 'REJECTED', 'ENROLLED']);

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

function toDate(value: string | Date | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(value as string);
}

export const admissionsService = {
  async list(query: ListAdmissionsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.AdmissionWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.search) {
      where.OR = [
        { applicantName: { contains: query.search } },
        { guardianName: { contains: query.search } },
        { guardianPhone: { contains: query.search } },
        { guardianEmail: { contains: query.search } },
      ];
    }
    const items = await prisma.admission.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { classLevel: true, academicYear: true, createdBy: true },
    });
    const total = await prisma.admission.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const admission = await prisma.admission.findUnique({
      where: { id },
      include: { classLevel: true, academicYear: true, createdBy: true },
    });
    if (!admission) throw ApiError.notFound('Admission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && admission.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return admission;
  },

  async create(input: CreateAdmissionInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const status = input.status ?? 'ENQUIRY';
    const admission = await prisma.admission.create({
      data: {
        schoolId,
        applicantName: input.applicantName,
        dateOfBirth: toDate(input.dateOfBirth) ?? null,
        gender: input.gender,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail,
        address: input.address,
        previousSchool: input.previousSchool,
        classLevelId: input.classLevelId,
        academicYearId: input.academicYearId,
        status,
        source: input.source ?? 'WALK_IN',
        notes: input.notes,
        followUpDate: toDate(input.followUpDate) ?? null,
        decidedAt: DECIDED_STATUSES.has(status) ? new Date() : null,
        createdById: actor.id,
      },
      include: { classLevel: true, academicYear: true, createdBy: true },
    });
    return admission;
  },

  async update(id: string, input: UpdateAdmissionInput, actor: Actor) {
    const existing = await prisma.admission.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Admission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const admission = await prisma.admission.update({
      where: { id },
      data: {
        ...(input.applicantName !== undefined ? { applicantName: input.applicantName } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: toDate(input.dateOfBirth) } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.guardianName !== undefined ? { guardianName: input.guardianName } : {}),
        ...(input.guardianPhone !== undefined ? { guardianPhone: input.guardianPhone } : {}),
        ...(input.guardianEmail !== undefined ? { guardianEmail: input.guardianEmail } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.previousSchool !== undefined ? { previousSchool: input.previousSchool } : {}),
        ...(input.classLevelId !== undefined ? { classLevelId: input.classLevelId } : {}),
        ...(input.academicYearId !== undefined ? { academicYearId: input.academicYearId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.followUpDate !== undefined ? { followUpDate: toDate(input.followUpDate) } : {}),
        ...(statusChanged
          ? { decidedAt: input.status && DECIDED_STATUSES.has(input.status) ? new Date() : null }
          : {}),
      },
      include: { classLevel: true, academicYear: true, createdBy: true },
    });
    return admission;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.admission.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Admission not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.admission.delete({ where: { id } });
    return { success: true };
  },
};
