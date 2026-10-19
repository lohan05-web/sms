import { attendanceIndicator, attendancePercentage, type AttendanceIndicator } from '@smartschool/shared';
import { useMemo } from 'react';

import { api } from './api';
import { useAuth } from './auth';
import type { TimetableItem } from './timetable';
import { useAsync } from './useAsync';

/**
 * The Teacher data layer, ported 1:1 from the web app's
 * `apps/web/src/pages/teacher/teacherScope.tsx`.
 *
 * Everything is derived from `GET /teachers/me`, which the backend authorises
 * from the session token — never from a client-supplied teacher id — so the
 * screens below can only ever render the signed-in teacher's own classes,
 * sections, subjects and students.
 */

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface TeacherSubject {
  id: string;
  name: string;
  code?: string | null;
}

export interface TeacherSection {
  id: string;
  name: string;
  classLevelId: string;
  classLevelName: string;
}

export interface TeacherAssignment {
  id: string;
  subjectId?: string | null;
  sectionId?: string | null;
  subject?: { id?: string; name?: string; code?: string | null } | null;
  section?:
    | {
        id?: string;
        name?: string;
        classLevel?: { id?: string; name?: string } | null;
      }
    | null;
  academicYear?: { id?: string; name?: string } | null;
}

export interface TeacherAttendanceCard {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: string;
}

export interface TeacherAttendance {
  today?: TeacherAttendanceCard;
  overall?: TeacherAttendanceCard;
}

export interface TeacherMe {
  id: string;
  employeeNo: string;
  qualification?: string | null;
  specialization?: string | null;
  designation?: string | null;
  employmentType?: string | null;
  joiningDate?: string | null;
  status?: string | null;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  school?: { name?: string } | null;
  assignments?: TeacherAssignment[];
  sectionsAsTeacher?: { id: string }[];
  timetableEntries?: TimetableItem[];
  attendance?: TeacherAttendance;
}

/** Everything a teacher screen needs, derived once from `/teachers/me`. */
export interface TeacherScope {
  teacher: TeacherMe;
  assignments: TeacherAssignment[];
  sections: TeacherSection[];
  sectionIds: string[];
  classLevels: { id: string; name: string }[];
  classLevelIds: string[];
  subjects: TeacherSubject[];
  timetableEntries: TimetableItem[];
  attendance?: TeacherAttendance;
}

export interface TeacherStudent {
  id: string;
  admissionNo: string;
  rollNo?: string | null;
  gender?: string | null;
  status?: string | null;
  user?: { firstName?: string; lastName?: string } | null;
  section?:
    | {
        id?: string;
        name?: string;
        classLevel?: { id?: string; name?: string } | null;
      }
    | null;
}

export interface AttendanceSummaryStudent {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  className: string | null;
  sectionName: string | null;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  percentage: number;
  indicator: AttendanceIndicator;
}

export interface AttendanceSummary {
  period: { kind: string; from: string; to: string; label: string };
  overall: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    halfDay: number;
    percentage: number;
    indicator: AttendanceIndicator;
  };
  students: AttendanceSummaryStudent[];
}

export interface ExamResultItem {
  id: string;
  marksObtained: number;
  grade?: string | null;
  remarks?: string | null;
  exam?: {
    id?: string;
    name?: string;
    maxMarks?: number | null;
    classLevelId?: string | null;
  } | null;
  subject?: { id?: string; name?: string } | null;
  student?: TeacherStudent | null;
}

/** An exam definition, as returned by `GET /exams`. */
export interface ExamItem {
  id: string;
  name: string;
  classLevelId?: string | null;
  subjectId?: string | null;
  maxMarks?: number | null;
  passingMarks?: number | null;
  startDate?: string | null;
  classLevel?: { id?: string; name?: string } | null;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  assignedDate?: string | null;
  dueDate?: string | null;
  subject?: { id?: string; name?: string } | null;
  section?:
    | {
        id?: string;
        name?: string;
        classLevel?: { name?: string } | null;
      }
    | null;
  teacher?: { id?: string; name?: string } | null;
  _count?: { submissions?: number };
}

export interface NoticeItem {
  id: string;
  title: string;
  body?: string | null;
  isPinned?: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
}

/* --------------------------------------------------------------------------
   Derivation
   -------------------------------------------------------------------------- */

function deriveScope(teacher: TeacherMe): TeacherScope {
  const assignments = teacher.assignments ?? [];

  const sectionMap = new Map<string, TeacherSection>();
  for (const assignment of assignments) {
    const section = assignment.section;
    if (section?.id) {
      sectionMap.set(section.id, {
        id: section.id,
        name: section.name ?? 'Section',
        classLevelId: section.classLevel?.id ?? '',
        classLevelName: section.classLevel?.name ?? '',
      });
    }
  }
  for (const section of teacher.sectionsAsTeacher ?? []) {
    if (!sectionMap.has(section.id)) {
      sectionMap.set(section.id, {
        id: section.id,
        name: 'Section',
        classLevelId: '',
        classLevelName: '',
      });
    }
  }
  const sections = [...sectionMap.values()];

  const classLevelMap = new Map<string, { id: string; name: string }>();
  for (const section of sections) {
    if (section.classLevelId) {
      classLevelMap.set(section.classLevelId, {
        id: section.classLevelId,
        name: section.classLevelName,
      });
    }
  }

  const subjectMap = new Map<string, TeacherSubject>();
  for (const assignment of assignments) {
    if (assignment.subject?.id) {
      subjectMap.set(assignment.subject.id, {
        id: assignment.subject.id,
        name: assignment.subject.name ?? 'Subject',
        code: assignment.subject.code ?? null,
      });
    }
  }

  return {
    teacher,
    assignments,
    sections,
    sectionIds: sections.map((section) => section.id),
    classLevels: [...classLevelMap.values()],
    classLevelIds: [...classLevelMap.keys()],
    subjects: [...subjectMap.values()],
    timetableEntries: teacher.timetableEntries ?? [],
    attendance: teacher.attendance,
  };
}

export interface TeacherScopeResult {
  scope: TeacherScope | null;
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  reload: () => void;
}

/** Loads the signed-in teacher's profile and derives the screens' data scope. */
export function useTeacherScope(): TeacherScopeResult {
  const { user } = useAuth();
  const state = useAsync<TeacherMe>(() => api.get<TeacherMe>('/teachers/me'), [user?.id]);
  const scope = useMemo(() => (state.data ? deriveScope(state.data) : null), [state.data]);
  return {
    scope,
    loading: state.loading,
    error: state.error,
    forbidden: state.forbidden,
    reload: state.reload,
  };
}

/* --------------------------------------------------------------------------
   Pagination
   -------------------------------------------------------------------------- */

/** Page size for paged list calls — the backend caps `limit` at 100. */
export const PAGE_LIMIT = 100;

/**
 * Hard ceiling on how many pages one logical list walks (10 × 100 = 1000 rows
 * per section/query). Keeps an unusual dataset from turning into an unbounded
 * request storm while comfortably covering realistic class sizes. When the
 * ceiling is hit, `truncated` is set so screens can say so out loud instead of
 * quietly presenting a partial list as the whole list.
 */
export const MAX_PAGES = 10;

/** The result of walking every page of a paged list endpoint. */
export interface PageFetch<T> {
  items: T[];
  /** Rows the server reports for the whole query, across every page. */
  total: number;
  /**
   * True only when `MAX_PAGES` was reached with rows still remaining, i.e. the
   * caller is looking at a subset. A bounded preview sets this to `false`
   * because truncation there is intentional, not a ceiling.
   */
  truncated: boolean;
}

/** An empty `PageFetch`, for the "nothing to fetch yet" branches. */
export function emptyPage<T>(): PageFetch<T> {
  return { items: [], total: 0, truncated: false };
}

/**
 * Fetches every page of a paged list endpoint, up to `MAX_PAGES`.
 *
 * `GET /students`, `GET /attendances`, `GET /exam-results` and `GET /homework`
 * all accept `page` / `limit` (max 100) and answer with
 * `meta { total, page, limit, totalPages }`, so pagination is genuinely
 * supported server-side — nothing here has to guess at a total or silently
 * drop the 101st student.
 */
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<PageFetch<T>> {
  const items: T[] = [];
  let total = 0;
  let page = 1;

  for (;;) {
    const result = await api.list<T>(path, { ...params, page, limit: PAGE_LIMIT });
    items.push(...result.items);
    total = result.meta.total;
    if (page >= result.meta.totalPages) return { items, total, truncated: false };
    if (page >= MAX_PAGES) return { items, total, truncated: true };
    page += 1;
  }
}

/* --------------------------------------------------------------------------
   Scoped fetchers (server narrows these to the teacher's own records)
   -------------------------------------------------------------------------- */

/** Students across every section the teacher is assigned to. */
export async function fetchStudentsForSections(
  sectionIds: readonly string[],
): Promise<PageFetch<TeacherStudent>> {
  if (sectionIds.length === 0) return emptyPage<TeacherStudent>();
  const pages = await Promise.all(
    sectionIds.map((sectionId) => fetchAllPages<TeacherStudent>('/students', { sectionId })),
  );
  const merged = mergePages(pages);
  merged.items.sort((a, b) => {
    const left = `${a.section?.classLevel?.name ?? ''}|${a.section?.name ?? ''}|${a.rollNo ?? ''}`;
    const right = `${b.section?.classLevel?.name ?? ''}|${b.section?.name ?? ''}|${b.rollNo ?? ''}`;
    return left.localeCompare(right, undefined, { numeric: true });
  });
  return merged;
}

/** Merges several already-fetched pages into one de-duplicated page. */
function mergePages<T extends { id: string }>(pages: readonly PageFetch<T>[]): PageFetch<T> {
  const byId = new Map<string, T>();
  let total = 0;
  let truncated = false;
  for (const page of pages) {
    total += page.total;
    truncated = truncated || page.truncated;
    for (const item of page.items) byId.set(item.id, item);
  }
  return { items: [...byId.values()], total, truncated };
}

/**
 * Fetches a school-scoped collection once per class level and merges the pages.
 *
 * `/exam-results`, `/exams` and `/lesson-plans` are all scoped to the school
 * only on the server, so the client narrows by `classLevelId` here. That keeps
 * the device from downloading rows for class levels the teacher does not teach,
 * and callers then filter the remainder (by subject, and by author for lesson
 * plans) before showing anything.
 */
export async function fetchByClassLevel<T extends { id: string }>(
  path: string,
  classLevelIds: readonly string[],
): Promise<PageFetch<T>> {
  if (classLevelIds.length === 0) return emptyPage<T>();
  const pages = await Promise.all(
    classLevelIds.map((classLevelId) => fetchAllPages<T>(path, { classLevelId })),
  );
  return mergePages(pages);
}

/** Exam results for the class levels the teacher teaches. */
export function fetchResultsForClassLevels(
  classLevelIds: readonly string[],
): Promise<PageFetch<ExamResultItem>> {
  return fetchByClassLevel<ExamResultItem>('/exam-results', classLevelIds);
}

/**
 * Exam definitions for the class levels the teacher teaches.
 *
 * `/exams` is school-scoped on the server (exams are a catalogue, like
 * subjects), so the caller narrows by class level here and then matches the
 * returned rows against the teacher's own subject list before offering them for
 * marks entry. Marks entry itself is separately teacher-scoped server-side, so a
 * stale id could never be used to write outside the teacher's classes.
 */
export function fetchExamsForClassLevels(
  classLevelIds: readonly string[],
): Promise<PageFetch<ExamItem>> {
  return fetchByClassLevel<ExamItem>('/exams', classLevelIds);
}

/**
 * Homework authored by the teacher, scoped server-side by teacher id.
 *
 * Without `preview` every page is loaded. With it, a single short request is
 * made and `meta.total` still reports the true number of assignments, so a
 * dashboard can show "12 assigned" above a list of the 5 most recent.
 */
export async function fetchTeacherHomework(
  teacherId: string,
  options: { preview?: number } = {},
): Promise<PageFetch<HomeworkItem>> {
  if (options.preview && options.preview > 0) {
    const page = await api.list<HomeworkItem>('/homework', {
      teacherId,
      page: 1,
      limit: options.preview,
    });
    return { items: page.items, total: page.meta.total, truncated: false };
  }
  return fetchAllPages<HomeworkItem>('/homework', { teacherId });
}

/** Attendance summary for a section (name + attendance percentage per student). */
export async function fetchAttendanceSummary(sectionId: string): Promise<AttendanceSummary> {
  return api.get<AttendanceSummary>(
    `/attendances/summary?sectionId=${encodeURIComponent(sectionId)}`,
  );
}

/* --------------------------------------------------------------------------
   Merging + formatting helpers
   -------------------------------------------------------------------------- */

const EMPTY_OVERALL: AttendanceSummary['overall'] = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  halfDay: 0,
  percentage: 0,
  indicator: 'good',
};

export const EMPTY_ATTENDANCE_SUMMARY: AttendanceSummary = {
  period: { kind: 'range', from: '', to: '', label: '' },
  overall: EMPTY_OVERALL,
  students: [],
};

/** Merges per-section summaries into a single overall summary. */
export function mergeAttendanceSummaries(
  summaries: readonly AttendanceSummary[],
): AttendanceSummary {
  if (summaries.length === 0) return EMPTY_ATTENDANCE_SUMMARY;
  const overall = { ...EMPTY_OVERALL };
  const students = new Map<string, AttendanceSummaryStudent>();

  for (const summary of summaries) {
    overall.total += summary.overall.total;
    overall.present += summary.overall.present;
    overall.absent += summary.overall.absent;
    overall.late += summary.overall.late;
    overall.excused += summary.overall.excused;
    overall.halfDay += summary.overall.halfDay;
    for (const student of summary.students) {
      const existing = students.get(student.studentId);
      if (!existing) {
        students.set(student.studentId, { ...student });
      } else {
        existing.total += student.total;
        existing.present += student.present;
        existing.absent += student.absent;
        existing.late += student.late;
        existing.excused += student.excused;
        existing.halfDay += student.halfDay;
      }
    }
  }

  overall.percentage = attendancePercentage(overall);
  overall.indicator = attendanceIndicator(overall.percentage);
  const merged = [...students.values()].map((student) => ({
    ...student,
    percentage: attendancePercentage(student),
    indicator: attendanceIndicator(attendancePercentage(student)),
  }));
  return { period: summaries[0]!.period, overall, students: merged };
}

/** "Full name, falling back to the admission number." */
export function studentNameOf(
  student: TeacherStudent | null | undefined,
  fallback = '—',
): string {
  if (!student) return fallback;
  const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
  return name || student.admissionNo || fallback;
}

/** `${class} · ${section}` for a student, or an em dash when unknown. */
export function studentClassLabel(student: TeacherStudent): string {
  return (
    [student.section?.classLevel?.name, student.section?.name].filter(Boolean).join(' · ') || '—'
  );
}

/** A short "24 marks · Good" style hint for an attendance card. */
export function attendanceHint(card?: TeacherAttendanceCard): string {
  if (!card) return 'No records yet';
  const indicator =
    card.indicator.charAt(0).toUpperCase() + card.indicator.slice(1).toLowerCase();
  return [`${card.total} marks`, indicator].filter(Boolean).join(' · ');
}
