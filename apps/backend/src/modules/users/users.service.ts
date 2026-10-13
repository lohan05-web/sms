import type { CreateUserInput, ListUsersQuery, Role, UpdateUserInput } from '@smartschool/shared';
import type { Prisma, Role as PrismaRole } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import { hashPassword } from '../../utils/password';
import { toPublicUser, type PublicUser } from '../auth/auth.service';

export interface Actor {
  id: string;
  role: Role;
  schoolId: string | null;
}

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') {
    return requestedSchoolId ?? undefined;
  }
  if (!actor.schoolId) {
    throw ApiError.forbidden('Your account is not linked to a school');
  }
  return actor.schoolId;
}

function assertCanAccess(actor: Actor, targetSchoolId: string | null, targetUserId: string): void {
  if (actor.role === 'SUPER_ADMIN') {
    return;
  }
  if (targetUserId === actor.id) {
    return;
  }
  if (!actor.schoolId || targetSchoolId !== actor.schoolId) {
    throw ApiError.forbidden('You can only manage users within your school');
  }
}

export const usersService = {
  async list(
    query: ListUsersQuery,
    actor: Actor,
  ): Promise<ReturnType<typeof paginate<PublicUser>>> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.UserWhereInput = {};

    const schoolId = resolveSchoolScope(actor);
    if (schoolId) {
      where.schoolId = schoolId;
    }
    if (query.role) {
      where.role = query.role as PrismaRole;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return paginate(items.map(toPublicUser), total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    assertCanAccess(actor, user.schoolId, user.id);
    return toPublicUser(user);
  },

  async create(input: CreateUserInput, actor: Actor): Promise<PublicUser> {
    if (actor.role !== 'SUPER_ADMIN' && input.role === 'SUPER_ADMIN') {
      throw ApiError.forbidden('Only a Super Admin can create Super Admin accounts');
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw ApiError.conflict('A user with this email already exists');
    }

    const schoolId = actor.role === 'SUPER_ADMIN' ? (input.schoolId ?? null) : actor.schoolId;

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role as PrismaRole,
        schoolId,
      },
    });

    return toPublicUser(user);
  },

  async update(id: string, input: UpdateUserInput, actor: Actor): Promise<PublicUser> {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('User not found');
    }
    assertCanAccess(actor, existing.schoolId, existing.id);

    if (actor.role !== 'SUPER_ADMIN' && input.role === 'SUPER_ADMIN') {
      throw ApiError.forbidden('Only a Super Admin can assign the Super Admin role');
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.role !== undefined ? { role: input.role as PrismaRole } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return toPublicUser(user);
  },

  async deactivate(id: string, actor: Actor): Promise<PublicUser> {
    if (id === actor.id) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('User not found');
    }
    assertCanAccess(actor, existing.schoolId, existing.id);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { isActive: false } });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });

    return toPublicUser(user);
  },
};
