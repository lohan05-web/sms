import type {
  CreateTeacherInput,
  ListTeachersQuery,
  UpdateTeacherInput,
} from '@smartschool/shared';
import {
  attendanceCountsFromRecord,
  attendanceMetrics,
} from '@smartschool/shared';
import type { AttendanceStatus, Prisma, Role as PrismaRole } from '@prisma/client';
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

function emptyAttendanceStatus(): Record<AttendanceStatus, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, HALF_DAY: 0 };
}

function attendanceCard(record: Record<AttendanceStatus, number>) {
  const metrics = attendanceMetrics(attendanceCountsFromRecord(record));
  return {
    total: metrics.total,
    byStatus: record,
    percentage: metrics.percentage,
    indicator: metrics.indicator,
  };
}

/** Today's and all-time attendance for the given sections. */
async function attendanceForSections(sectionIds: string[]) {
  const empty = {
    today: attendanceCard(emptyAttendanceStatus()),
    overall: attendanceCard(emptyAttendanceStatus()),
  };
  if (sectionIds.length === 0) return empty;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [overallGroups, todayGroups] = await Promise.all([
    prisma.attendance.groupBy({
      by: ['status'],
      where: { sectionId: { in: sectionIds } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { sectionId: { in: sectionIds }, date: { gte: today, lt: tomorrow } },
      _count: { _all: true },
    }),
  ]);

  const overall = emptyAttendanceStatus();
  for (const group of overallGroups) overall[group.status] = group._count._all;
  const todayCounts = emptyAttendanceStatus();
  for (const group of todayGroups) todayCounts[group.status] = group._count._all;

  return { today: attendanceCard(todayCounts), overall: attendanceCard(overall) };
}

export const teachersService = {
  async list(query: ListTeachersQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TeacherProfileWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.status) where.status = query.status;
    if (query.designation) where.designation = query.designation;
    if (query.employmentType) where.employmentType = query.employmentType;
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
      include: {
        user: true,
        school: true,
        sectionsAsTeacher: {
          include: { classLevel: { select: { id: true, name: true } } },
        },
      },
    });
    const total = await prisma.teacherProfile.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  /** The signed-in teacher's own profile plus their teaching assignments. */
  async me(actor: Actor) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: actor.id },
      include: {
        user: true,
        school: true,
        assignments: {
          include: {
            subject: true,
            section: { include: { classLevel: true } },
            academicYear: true,
          },
        },
        sectionsAsTeacher: { select: { id: true } },
        timetableEntries: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          include: {
            subject: { select: { id: true, name: true, code: true } },
            section: {
              select: { id: true, name: true, classLevel: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!teacher) throw ApiError.notFound('No teacher profile is linked to this account');

    const sectionIds = new Set<string>([
      ...teacher.assignments.map((assignment) => assignment.sectionId),
      ...teacher.sectionsAsTeacher.map((section) => section.id),
    ]);
    const attendance = await attendanceForSections([...sectionIds]);

    return { ...teacher, attendance };
  },

  async getById(id: string, actor: Actor) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true, assignments: { include: { subject: true, section: true } } },
    });
    if (!teacher) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && teacher.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return teacher;
  },

  async create(input: CreateTeacherInput, actor: Actor) {
    // Resolve from the request for super admins, but never let a scoped admin
    // pick another school: for them resolveSchoolScope returns their own school.
    // Fall back to the signed-in admin's school so the front end never has to
    // send a school id explicitly.
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const targetSchoolId: string = schoolId;

    if (!input.email) {
      throw ApiError.badRequest('An email address is required so the teacher can sign in');
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('A user with this email already exists');

    const plainPassword = input.password ?? generatePassword();
    const initialPassword = input.password ? undefined : plainPassword;
    const passwordHash = await hashPassword(plainPassword);

    // Create the login and the teacher profile together so a failure (e.g. a
    // duplicate employee number) never leaves an orphaned user behind.
    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: 'TEACHER' as PrismaRole,
          schoolId: targetSchoolId,
        },
      });

      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId: targetSchoolId,
          employeeNo: input.employeeNo,
          qualification: input.qualification,
          specialization: input.specialization,
          designation: input.designation,
          employmentType: input.employmentType,
          joiningDate: new Date(input.joiningDate as any),
        },
        include: { user: true },
      });
    });

    return initialPassword ? { ...teacher, initialPassword } : teacher;
  },

  async update(id: string, input: UpdateTeacherInput, actor: Actor) {
    const existing = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Teacher not found');
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

      return tx.teacherProfile.update({
        where: { id },
        data: {
          ...(input.qualification !== undefined ? { qualification: input.qualification } : {}),
          ...(input.specialization !== undefined ? { specialization: input.specialization } : {}),
          ...(input.designation !== undefined ? { designation: input.designation } : {}),
          ...(input.employmentType !== undefined ? { employmentType: input.employmentType } : {}),
          ...(input.status !== undefined ? { status: input.status as any } : {}),
        },
        include: { user: true },
      });
    });
  },

  async setActive(id: string, isActive: boolean, actor: Actor) {
    const existing = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!existing.user) throw ApiError.badRequest('This teacher has no login account');

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
      return tx.teacherProfile.findUnique({ where: { id }, include: { user: true } });
    });
  },

  /** Generate and assign a fresh password, returning it once for the admin. */
  async resetPassword(id: string, actor: Actor) {
    const existing = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!existing.user) throw ApiError.badRequest('This teacher has no login account to reset');

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
    const existing = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Teacher not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.teacherProfile.update({ where: { id }, data: { status: 'INACTIVE' as any } });
    return { success: true };
  },
};
