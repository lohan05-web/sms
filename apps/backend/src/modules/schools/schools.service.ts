import type { ListSchoolsQuery, UpdateSchoolInput } from '@smartschool/shared';
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

export const schoolsService = {
  async list(query: ListSchoolsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const scope = resolveSchoolScope(actor);
    const where: Prisma.SchoolWhereInput = {};
    if (scope) where.id = scope;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
    }
    const items = await prisma.school.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.school.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) throw ApiError.notFound('School not found');
    const scope = resolveSchoolScope(actor);
    if (scope && school.id !== scope) throw ApiError.forbidden('Access denied');
    return school;
  },

  async getMine(actor: Actor) {
    if (!actor.schoolId) throw ApiError.badRequest('No school is associated with your account');
    const school = await prisma.school.findUnique({ where: { id: actor.schoolId } });
    if (!school) throw ApiError.notFound('School not found');
    return school;
  },

  async update(id: string, input: UpdateSchoolInput, actor: Actor) {
    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('School not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.id !== scope) throw ApiError.forbidden('Access denied');

    if (input.code && input.code !== existing.code) {
      const duplicate = await prisma.school.findFirst({
        where: { code: input.code, id: { not: id } },
      });
      if (duplicate) throw ApiError.badRequest('School code is already in use');
    }

    return prisma.school.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  },
};
