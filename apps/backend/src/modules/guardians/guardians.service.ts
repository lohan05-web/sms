import type {
  CreateGuardianInput,
  ListGuardiansQuery,
  UpdateGuardianInput,
} from '@smartschool/shared';
import type { Prisma, Role as PrismaRole } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import { hashPassword } from '../../utils/password';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const guardiansService = {
  async list(query: ListGuardiansQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.GuardianWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }
    const items = await prisma.guardian.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true, students: { include: { student: true } } },
    });
    const total = await prisma.guardian.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const guardian = await prisma.guardian.findUnique({
      where: { id },
      include: { user: true, students: { include: { student: true } } },
    });
    if (!guardian) throw ApiError.notFound('Guardian not found');
    const scope = resolveSchoolScope(actor);
    if (scope && guardian.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return guardian;
  },
  async create(input: CreateGuardianInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    let userId: string | null = null;
    if (input.email && input.password) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw ApiError.conflict('A user with this email already exists');
      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: 'PARENT' as PrismaRole,
          schoolId,
        },
      });
      userId = user.id;
    }
    const guardian = await prisma.guardian.create({
      data: {
        userId: userId as any,
        schoolId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        occupation: input.occupation,
        address: input.address,
      },
      include: { user: true },
    });
    if (input.studentIds && input.studentIds.length > 0) {
      await prisma.studentGuardian.createMany({
        data: input.studentIds.map((sid) => ({
          studentId: sid,
          guardianId: guardian.id,
          relation: input.relation,
        })),
        skipDuplicates: true,
      });
    }
    return guardian;
  },
  async update(id: string, input: UpdateGuardianInput, actor: Actor) {
    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Guardian not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const guardian = await prisma.guardian.update({
      where: { id },
      data: {
        ...(input.occupation !== undefined ? { occupation: input.occupation } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.relation !== undefined ? { relation: input.relation as any } : {}),
      },
      include: { user: true },
    });
    return guardian;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Guardian not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.studentGuardian.deleteMany({ where: { guardianId: id } });
    await prisma.guardian.delete({ where: { id } });
    return { success: true };
  },
};
