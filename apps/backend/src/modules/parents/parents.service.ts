import type { AttendanceStatus } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

function emptyAttendance(): Record<AttendanceStatus, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, HALF_DAY: 0 };
}

async function requireGuardian(actor: Actor) {
  const guardian = await prisma.guardian.findFirst({ where: { userId: actor.id } });
  if (!guardian) {
    throw ApiError.forbidden('No parent profile is linked to this account');
  }
  return guardian;
}

/** Ensure the requested student is actually one of the signed-in parent's children. */
async function assertChild(actor: Actor, studentId: string) {
  const guardian = await requireGuardian(actor);
  const link = await prisma.studentGuardian.findFirst({
    where: { guardianId: guardian.id, studentId },
  });
  if (!link) throw ApiError.forbidden('You can only view information about your own children');
  return guardian;
}

/** The teachers assigned to a section, with the details the parent portal shows. */
async function teachersForSection(sectionId: string) {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { sectionId },
    include: {
      teacher: { include: { user: true } },
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return assignments.map((assignment) => {
    const user = assignment.teacher.user;
    return {
      id: assignment.id,
      teacherId: assignment.teacherId,
      name: user ? `${user.firstName} ${user.lastName}` : null,
      photoUrl: user?.avatarUrl ?? null,
      subject: assignment.subject.name,
      contact: user?.phone ?? user?.email ?? null,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
    };
  });
}

export const parentsService = {
  /** The parent's own profile plus a per-child summary the portal renders. */
  async overview(actor: Actor) {
    const guardian = await requireGuardian(actor);

    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: { user: true, section: { include: { classLevel: true } } },
        },
      },
    });

    const children = await Promise.all(
      links.map(async (link) => {
        const student = link.student;
        const [attendanceGroups, results, invoices, teachers] = await Promise.all([
          prisma.attendance.groupBy({
            by: ['status'],
            where: { studentId: student.id },
            _count: { _all: true },
          }),
          prisma.examResult.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { exam: true, subject: true },
          }),
          prisma.invoice.findMany({
            where: { studentId: student.id },
            orderBy: { issueDate: 'desc' },
            take: 5,
          }),
          student.sectionId ? teachersForSection(student.sectionId) : Promise.resolve([]),
        ]);

        const attendance = emptyAttendance();
        for (const group of attendanceGroups) attendance[group.status] = group._count._all;
        const attendanceTotal = Object.values(attendance).reduce((sum, n) => sum + n, 0);

        return {
          id: student.id,
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          photoUrl: student.photoUrl,
          status: student.status,
          gender: student.gender,
          name: student.user ? `${student.user.firstName} ${student.user.lastName}` : null,
          className: student.section?.classLevel?.name ?? null,
          sectionName: student.section?.name ?? null,
          section: student.section
            ? { name: student.section.name, classLevel: student.section.classLevel?.name ?? null }
            : null,
          teacherCount: teachers.length,
          teachers,
          relation: link.relation,
          isPrimary: link.isPrimary,
          attendance: { total: attendanceTotal, byStatus: attendance },
          results,
          invoices,
          outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0),
        };
      }),
    );

    return {
      parent: {
        id: guardian.id,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        email: guardian.email,
        phone: guardian.phone,
      },
      children,
    };
  },

  async childAttendance(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    return prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 120,
      include: { section: { include: { classLevel: true } } },
    });
  },

  async childResults(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    return prisma.examResult.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { exam: true, subject: true },
    });
  },
};
