import type {
  CreateTeacherInput,
  ListTeachersQuery,
  UpdateTeacherInput,
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

export const teachersService = {
  async list(query: ListTeachersQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TeacherProfileWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { employeeNo: { contains: query.search } },
        { user: { firstName: { contains: query.search } } },
        { user: { lastName: { contains: query.search } } },
        { user: { email: { contains: query.search } } },
      ];
    }
    const items = await prisma.teacherProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true, school: true },
    });
    const total = await prisma.teacherProfile.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!teacher) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && teacher.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return teacher;
  },
  async create(input: CreateTeacherInput, actor: Actor) {
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
          role: 'TEACHER' as PrismaRole,
          schoolId,
        },
      });
      userId = user.id;
    }
    const teacher = await prisma.teacherProfile.create({
      data: {
        userId: userId as any,
        schoolId,
        employeeNo: input.employeeNo,
        qualification: input.qualification,
        specialization: input.specialization,
        joiningDate: new Date(input.joiningDate as any),
      },
      include: { user: true },
    });
    return teacher;
  },
  async update(id: string, input: UpdateTeacherInput, actor: Actor) {
    const existing = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacher = await prisma.teacherProfile.update({
      where: { id },
      data: {
        ...(input.qualification !== undefined ? { qualification: input.qualification } : {}),
        ...(input.specialization !== undefined ? { specialization: input.specialization } : {}),
        ...(input.status !== undefined ? { status: input.status as any } : {}),
      },
      include: { user: true },
    });
    return teacher;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.teacherProfile.update({ where: { id }, data: { status: 'INACTIVE' as any } });
    return { success: true };
  },
};
