import type {
  CreateStudentInput,
  ListStudentsQuery,
  UpdateStudentInput,
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

export const studentsService = {
  async list(query: ListStudentsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.StudentProfileWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { admissionNo: { contains: query.search } },
        { user: { firstName: { contains: query.search } } },
        { user: { lastName: { contains: query.search } } },
        { user: { email: { contains: query.search } } },
      ];
    }
    const items = await prisma.studentProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true, section: { include: { classLevel: true } }, school: true },
    });
    const total = await prisma.studentProfile.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        section: { include: { classLevel: true } },
        guardians: { include: { guardian: true } },
      },
    });
    if (!student) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return student;
  },
  async create(input: CreateStudentInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId);
    if (!schoolId) throw ApiError.badRequest('School is required');
    let userId: string | undefined;
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
          role: 'STUDENT' as PrismaRole,
          schoolId,
        },
      });
      userId = user.id;
    }
    const student = await prisma.studentProfile.create({
      data: {
        userId,
        schoolId,
        admissionNo: input.admissionNo,
        admissionDate: new Date(input.admissionDate as any),
        dateOfBirth: new Date(input.dateOfBirth as any),
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        rollNo: input.rollNo,
        sectionId: input.sectionId,
      },
      include: { user: true, section: { include: { classLevel: true } } },
    });
    if (input.guardianIds && input.guardianIds.length > 0) {
      await prisma.studentGuardian.createMany({
        data: input.guardianIds.map((gid) => ({
          studentId: student.id,
          guardianId: gid,
          relation: 'GUARDIAN' as any,
        })),
        skipDuplicates: true,
      });
    }
    return student;
  },
  async update(id: string, input: UpdateStudentInput, actor: Actor) {
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const student = await prisma.studentProfile.update({
      where: { id },
      data: {
        ...(input.rollNo !== undefined ? { rollNo: input.rollNo } : {}),
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
      include: { user: true, section: { include: { classLevel: true } } },
    });
    return student;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.studentProfile.update({ where: { id }, data: { status: 'INACTIVE' } });
    return { success: true };
  },
};
