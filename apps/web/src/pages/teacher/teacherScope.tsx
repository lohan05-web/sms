import { attendanceIndicator, attendancePercentage, type AttendanceIndicator } from '@smartschool/shared';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { IconName } from '../../components/Icon';
import { ErrorState, PageHeader, SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { TimetableItem } from '../../lib/timetable';
import { useAsync } from '../../lib/useAsync';
import { ForbiddenPage } from '../ForbiddenPage';

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
  subject?: TeacherSubject | null;
  section?: {
    id?: string;
    name?: string;
    classLevel?: { id?: string; name?: string } | null;
  } | null;
  academicYear?: { id?: string; name?: string } | null;
}

export interface AttendanceCounts {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: string;
}

export interface TeacherAttendance {
  today: AttendanceCounts;
  overall: AttendanceCounts;
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

/** Everything a teacher-scoped page needs, derived once from `/teachers/me`. */
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
  section?: {
    id?: string;
    name?: string;
    classLevel?: { id?: string; name?: string } | null;
  } | null;
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
  exam?: { id?: string; name?: string; maxMarks?: number | null; classLevelId?: string | null } | null;
  subject?: { id?: string; name?: string } | null;
  student?: TeacherStudent | null;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  assignedDate?: string | null;
  dueDate?: string | null;
  subject?: { id?: string; name?: string } | null;
  section?: { id?: string; name?: string; classLevel?: { name?: string } | null } | null;
  teacher?: { id?: string; name?: string } | null;
  _count?: { submissions?: number };
}

/* --------------------------------------------------------------------------
   Derivation + data helpers
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

/** Loads the signed-in teacher's profile and derives the pages' data scope. */
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

/** Students across every section the teacher is assigned to (server-filtered per section). */
export async function fetchStudentsForSections(sectionIds: readonly string[]): Promise<TeacherStudent[]> {
  if (sectionIds.length === 0) return [];
  const pages = await Promise.all(
    sectionIds.map((sectionId) => api.list<TeacherStudent>('/students', { sectionId, limit: 100 })),
  );
  const byId = new Map<string, TeacherStudent>();
  for (const page of pages) {
    for (const student of page.items) byId.set(student.id, student);
  }
  return [...byId.values()].sort((a, b) => {
    const left = `${a.section?.classLevel?.name ?? ''}|${a.section?.name ?? ''}|${a.rollNo ?? ''}`;
    const right = `${b.section?.classLevel?.name ?? ''}|${b.section?.name ?? ''}|${b.rollNo ?? ''}`;
    return left.localeCompare(right, undefined, { numeric: true });
  });
}

/** Exam results for the class levels the teacher teaches (server-filtered per class level). */
export async function fetchResultsForClassLevels(
  classLevelIds: readonly string[],
): Promise<ExamResultItem[]> {
  if (classLevelIds.length === 0) return [];
  const pages = await Promise.all(
    classLevelIds.map((classLevelId) =>
      api.list<ExamResultItem>('/exam-results', { classLevelId, limit: 100 }),
    ),
  );
  const byId = new Map<string, ExamResultItem>();
  for (const page of pages) {
    for (const result of page.items) byId.set(result.id, result);
  }
  return [...byId.values()];
}

/** Homework authored by the teacher, scoped server-side by teacher id. */
export async function fetchTeacherHomework(
  teacherId: string,
  limit = 100,
): Promise<{ items: HomeworkItem[]; total: number }> {
  const page = await api.list<HomeworkItem>('/homework', { teacherId, limit });
  return { items: page.items, total: page.meta.total };
}

/** Attendance summary for a section (name + attendance percentage per student). */
export async function fetchAttendanceSummary(sectionId: string): Promise<AttendanceSummary> {
  return api.get<AttendanceSummary>(
    `/attendances/summary?sectionId=${encodeURIComponent(sectionId)}`,
  );
}

/** Merges per-section summaries into a single overall summary. */
export function mergeAttendanceSummaries(summaries: readonly AttendanceSummary[]): AttendanceSummary {
  const empty: AttendanceSummary['overall'] = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    halfDay: 0,
    percentage: 0,
    indicator: 'good',
  };
  if (summaries.length === 0) {
    return { period: { kind: 'range', from: '', to: '', label: '' }, overall: empty, students: [] };
  }
  const overall = { ...empty };
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

/** Small helper so a page can render a heading + a scoped body with one call. */
export function TeacherScaffold({
  title,
  subtitle,
  icon,
  actions,
  loading,
  error,
  forbidden,
  reload,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  actions?: ReactNode;
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  reload: () => void;
  children: ReactNode;
}) {
  if (forbidden) return <ForbiddenPage />;
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <SkeletonPanels count={2} />
      ) : (
        /* Stacked sections need explicit vertical rhythm — without this wrapper
           the stat grid and panels render as touching block siblings. */
        <div className="page__body">{children}</div>
      )}
    </div>
  );
}
