import type {
  CreateMyServiceRequestInput,
  CreateServiceRequestInput,
  ListServiceRequestsQuery,
  UpdateServiceRequestInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

const TERMINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'COMPLETED']);

const requestInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
  requestedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ServiceRequestInclude;

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

async function assertStudentInSchool(schoolId: string, studentId: string): Promise<void> {
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== schoolId) {
    throw ApiError.badRequest('Student does not belong to this school');
  }
}

async function requireGuardian(actor: Actor) {
  const guardian = await prisma.guardian.findFirst({ where: { userId: actor.id } });
  if (!guardian) throw ApiError.forbidden('No parent profile is linked to this account');
  return guardian;
}

async function requireStudent(actor: Actor) {
  const student = await prisma.studentProfile.findFirst({ where: { userId: actor.id } });
  if (!student) throw ApiError.forbidden('No student profile is linked to this account');
  return student;
}

/** Collects the ids a self-service actor owns: themselves plus their children. */
async function ownerScope(actor: Actor): Promise<Prisma.ServiceRequestWhereInput> {
  if (actor.role === 'PARENT') {
    const guardian = await requireGuardian(actor);
    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      select: { studentId: true },
    });
    const childIds = links.map((link) => link.studentId);
    return {
      OR: [
        { requestedById: actor.id },
        ...(childIds.length ? [{ studentId: { in: childIds } }] : []),
      ],
    };
  }
  const student = await requireStudent(actor);
  return { OR: [{ requestedById: actor.id }, { studentId: student.id }] };
}

export const serviceRequestsService = {
  async list(query: ListServiceRequestsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ServiceRequestWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.studentId) where.studentId = query.studentId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }
    const items = await prisma.serviceRequest.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
    const total = await prisma.serviceRequest.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) throw ApiError.notFound('Service request not found');
    const scope = resolveSchoolScope(actor);
    if (scope && request.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return request;
  },

  async create(input: CreateServiceRequestInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    if (input.studentId) await assertStudentInSchool(schoolId, input.studentId);
    const status = input.status ?? 'PENDING';
    return prisma.serviceRequest.create({
      data: {
        schoolId,
        type: input.type ?? 'OTHER',
        title: input.title,
        description: input.description,
        status,
        studentId: input.studentId ?? null,
        requestedById: actor.id,
        resolvedById: TERMINAL_STATUSES.has(status) ? actor.id : null,
        resolvedAt: TERMINAL_STATUSES.has(status) ? new Date() : null,
      },
      include: requestInclude,
    });
  },

  async update(id: string, input: UpdateServiceRequestInput, actor: Actor) {
    const existing = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Service request not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.studentId) await assertStudentInSchool(existing.schoolId, input.studentId);

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const resolved =
      statusChanged && input.status && TERMINAL_STATUSES.has(input.status)
        ? { resolvedById: actor.id, resolvedAt: new Date() }
        : statusChanged
          ? { resolvedById: null, resolvedAt: null }
          : {};

    return prisma.serviceRequest.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.studentId !== undefined ? { studentId: input.studentId } : {}),
        ...(input.response !== undefined ? { response: input.response } : {}),
        ...resolved,
      },
      include: requestInclude,
    });
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Service request not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.serviceRequest.delete({ where: { id } });
    return { success: true };
  },

  async listMine(actor: Actor) {
    const scope = await ownerScope(actor);
    const schoolId = resolveSchoolScope(actor);
    return prisma.serviceRequest.findMany({
      where: { ...scope, ...(schoolId ? { schoolId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: requestInclude,
    });
  },

  async createMine(input: CreateMyServiceRequestInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor);
    if (!schoolId) throw ApiError.badRequest('Your account is not linked to a school');
    let studentId = input.studentId ?? null;

    if (actor.role === 'PARENT') {
      if (studentId) {
        const guardian = await requireGuardian(actor);
        const link = await prisma.studentGuardian.findFirst({
          where: { guardianId: guardian.id, studentId },
        });
        if (!link) throw ApiError.forbidden('You can only raise requests for your own children');
      }
    } else {
      const student = await requireStudent(actor);
      if (studentId && studentId !== student.id) {
        throw ApiError.forbidden('You can only raise requests for yourself');
      }
      studentId = student.id;
    }

    return prisma.serviceRequest.create({
      data: {
        schoolId,
        type: input.type ?? 'OTHER',
        title: input.title,
        description: input.description,
        status: 'PENDING',
        studentId,
        requestedById: actor.id,
      },
      include: requestInclude,
    });
  },
};
