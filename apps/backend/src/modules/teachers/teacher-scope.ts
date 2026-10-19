import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

/**
 * Server-side data scope for a signed-in teacher, derived exclusively from the
 * authenticated user id (the access token's `sub`). Nothing the client sends —
 * including a `teacherId` query parameter or request body field — is trusted on
 * its own: it is always validated against this scope or rejected.
 *
 * A teacher may access:
 *  - students, attendance and homework for sections they teach
 *    (TeacherAssignment) or where they are the class teacher
 *    (Section.classTeacherId);
 *  - exam results for those students, limited to the subjects they teach and to
 *    exams of the class levels they teach;
 *  - timetable entries assigned to them (plus the sections they class-teach);
 *  - homework authored by them, or homework for a section and subject they
 *    teach, together with that homework's submissions.
 */
export interface TeacherScope {
  /** TeacherProfile.id resolved from the authenticated user. */
  profileId: string;
  /** Sections taken from teaching assignments. */
  assignedSectionIds: string[];
  /** Sections where this teacher is the class teacher. */
  classTeacherSectionIds: string[];
  /** Union of both: every section the teacher may access. */
  sectionIds: string[];
  /** Class levels of the accessible sections. */
  classLevelIds: string[];
  /** Subjects the teacher teaches in at least one section. */
  subjectIds: string[];
}

/**
 * Resolves the scope for a TEACHER actor, or returns null for any other role so
 * callers can no-op. Throws 403 when the account has no teacher profile.
 */
export async function resolveTeacherScope(actor: Actor): Promise<TeacherScope | null> {
  if (actor.role !== 'TEACHER') return null;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: actor.id },
    select: {
      id: true,
      assignments: {
        select: {
          sectionId: true,
          subjectId: true,
          section: { select: { classLevelId: true } },
        },
      },
      sectionsAsTeacher: { select: { id: true, classLevelId: true } },
    },
  });
  if (!teacher) throw ApiError.forbidden('No teacher profile is linked to this account');

  const assignedSectionIds = new Set<string>();
  const classTeacherSectionIds = new Set<string>();
  const classLevelIds = new Set<string>();
  const subjectIds = new Set<string>();

  for (const assignment of teacher.assignments) {
    assignedSectionIds.add(assignment.sectionId);
    subjectIds.add(assignment.subjectId);
    if (assignment.section?.classLevelId) classLevelIds.add(assignment.section.classLevelId);
  }
  for (const section of teacher.sectionsAsTeacher) {
    classTeacherSectionIds.add(section.id);
    if (section.classLevelId) classLevelIds.add(section.classLevelId);
  }

  return {
    profileId: teacher.id,
    assignedSectionIds: [...assignedSectionIds],
    classTeacherSectionIds: [...classTeacherSectionIds],
    sectionIds: [...new Set([...assignedSectionIds, ...classTeacherSectionIds])],
    classLevelIds: [...classLevelIds],
    subjectIds: [...subjectIds],
  };
}

export function assertSectionInScope(scope: TeacherScope, sectionId: string): void {
  if (!scope.sectionIds.includes(sectionId)) {
    throw ApiError.forbidden('You are not assigned to this section');
  }
}

export function assertClassLevelInScope(scope: TeacherScope, classLevelId: string): void {
  if (!scope.classLevelIds.includes(classLevelId)) {
    throw ApiError.forbidden('You are not assigned to this class');
  }
}

export function assertSubjectInScope(scope: TeacherScope, subjectId: string): void {
  if (!scope.subjectIds.includes(subjectId)) {
    throw ApiError.forbidden('You are not assigned to this subject');
  }
}

/** A client-supplied teacher id may only ever refer to the signed-in teacher. */
export function assertTeacherIdIsSelf(
  scope: TeacherScope,
  teacherId: string | null | undefined,
): void {
  if (teacherId && teacherId !== scope.profileId) {
    throw ApiError.forbidden('You can only act as yourself');
  }
}

export function assertStudentInScope(
  scope: TeacherScope,
  student: { sectionId: string | null },
): void {
  if (!student.sectionId || !scope.sectionIds.includes(student.sectionId)) {
    throw ApiError.forbidden('You are not assigned to this student');
  }
}

export interface HomeworkLike {
  teacherId: string | null;
  sectionId: string;
  subjectId: string;
}

/** Homework authored by the teacher, or taught by them in that section. */
export function canAccessHomework(scope: TeacherScope, homework: HomeworkLike): boolean {
  if (homework.teacherId === scope.profileId) return true;
  return (
    scope.sectionIds.includes(homework.sectionId) && scope.subjectIds.includes(homework.subjectId)
  );
}

export function assertHomeworkInScope(scope: TeacherScope, homework: HomeworkLike): void {
  if (!canAccessHomework(scope, homework)) {
    throw ApiError.forbidden('You are not authorised for this homework');
  }
}

/** Prisma filter narrowing homework rows to what the teacher may access. */
export function homeworkScopeWhere(scope: TeacherScope): Prisma.HomeworkWhereInput {
  return {
    OR: [
      { teacherId: scope.profileId },
      { sectionId: { in: scope.sectionIds }, subjectId: { in: scope.subjectIds } },
    ],
  };
}

/** Timetable entries assigned to the teacher, or to a section they class-teach. */
export function canAccessTimetableEntry(
  scope: TeacherScope,
  entry: { teacherId: string | null; sectionId: string },
): boolean {
  if (entry.teacherId === scope.profileId) return true;
  return scope.classTeacherSectionIds.includes(entry.sectionId);
}

export function assertTimetableEntryInScope(
  scope: TeacherScope,
  entry: { teacherId: string | null; sectionId: string },
): void {
  if (!canAccessTimetableEntry(scope, entry)) {
    throw ApiError.forbidden('This timetable entry is not assigned to you');
  }
}
