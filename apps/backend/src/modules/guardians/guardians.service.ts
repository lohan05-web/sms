import type {
  CreateGuardianInput,
  ListGuardiansQuery,
  UpdateGuardianInput,
} from '@smartschool/shared';
import type { Prisma, Role as PrismaRole } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import { generatePassword, hashPassword } from '../../utils/password';
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
    if (!guardian) throw ApiError.notFound('Parent not found');
    const scope = resolveSchoolScope(actor);
    if (scope && guardian.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return guardian;
  },

  async create(input: CreateGuardianInput, actor: Actor) {
    // Fall back to the signed-in admin's school so the client never has to send
    // a school id explicitly (mirrors the teacher creation flow).
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    let userId: string | null = null;
    let initialPassword: string | undefined;

    if (input.email) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw ApiError.conflict('A user with this email already exists');

      const plainPassword = input.password ?? generatePassword();
      if (!input.password) initialPassword = plainPassword;

      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(plainPassword),
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

    return initialPassword ? { ...guardian, initialPassword } : guardian;
  },

  async update(id: string, input: UpdateGuardianInput, actor: Actor) {
    const existing = await prisma.guardian.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Parent not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');

    return prisma.$transaction(async (tx) => {
      if (existing.user) {
        const userData: Prisma.UserUpdateInput = {};
        if (input.firstName !== undefined) userData.firstName = input.firstName;
        if (input.lastName !== undefined) userData.lastName = input.lastName;
        if (input.phone !== undefined) userData.phone = input.phone;
        if (input.isActive !== undefined) userData.isActive = input.isActive;

        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: existing.user.id }, data: userData });
          if (input.isActive === false) {
            await tx.refreshToken.updateMany({
              where: { userId: existing.user.id, revokedAt: null },
              data: { revokedAt: new Date() },
            });
          }
        }
      }

      if (input.studentIds !== undefined) {
        await tx.studentGuardian.deleteMany({ where: { guardianId: id } });
        if (input.studentIds.length > 0) {
          await tx.studentGuardian.createMany({
            data: input.studentIds.map((sid) => ({
              studentId: sid,
              guardianId: id,
              relation: (input.relation ?? 'GUARDIAN') as any,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.guardian.update({
        where: { id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.occupation !== undefined ? { occupation: input.occupation } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
        },
        include: { user: true, students: { include: { student: true } } },
      });
    });
  },

  async setActive(id: string, isActive: boolean, actor: Actor) {
    const existing = await prisma.guardian.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Parent not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!existing.user) throw ApiError.badRequest('This parent has no login account');

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: existing.user!.id },
        data: { isActive },
      });
      if (!isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.guardian.findUnique({ where: { id }, include: { user: true } });
    });
  },

  /** Generate and assign a fresh password, returning it once for the admin. */
  async resetPassword(id: string, actor: Actor) {
    const existing = await prisma.guardian.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Parent not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!existing.user) throw ApiError.badRequest('This parent has no login account to reset');

    const password = generatePassword();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.user.id },
        data: { passwordHash: await hashPassword(password) },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: existing.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { password };
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.guardian.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Parent not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.studentGuardian.deleteMany({ where: { guardianId: id } });
    await prisma.guardian.delete({ where: { id } });
    return { success: true };
  },
};
