import type { IconName } from '../components/Icon';
import { asString, formatCurrency, formatDate, formatDateTime, humanize } from './format';

/**
 * Config-driven definitions for the school modules the mobile app lists.
 *
 * They mirror the column definitions the web app uses in `apps/web/src/resources.tsx`
 * (same endpoints, same field paths), so the mobile "resource" screen renders
 * exactly the data the web table shows — no invented endpoints or mock data.
 */
export type Row = Record<string, unknown>;

export interface ResourceColumn {
  label: string;
  get: (row: Row) => string;
}

export interface ResourceConfig {
  key: string;
  title: string;
  subtitle?: string;
  /** API path relative to the `/api/v1` base. */
  path: string;
  icon?: IconName;
  /** Whether the endpoint supports the `search` query parameter. */
  searchable?: boolean;
  columns: ResourceColumn[];
}

/* -------------------------------------------------------------------------- */
/*  Safe field accessors (dot-paths, tolerant of missing data)                 */
/* -------------------------------------------------------------------------- */

function at(row: Row, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, row);
}

/** First non-empty value among the given dot-paths. */
function firstOf(row: Row, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = at(row, key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** First non-empty string among the given dot-paths. */
function pick(row: Row, ...keys: string[]): string {
  return asString(firstOf(row, ...keys));
}

/** Build a full name from the first prefix that yields one. */
function person(row: Row, ...prefixes: string[]): string {
  for (const prefix of prefixes) {
    const base = prefix ? `${prefix}.` : '';
    const name = `${pick(row, `${base}firstName`)} ${pick(row, `${base}lastName`)}`.trim();
    if (name) return name;
  }
  return '';
}

function nameOrTitle(row: Row): string {
  return pick(row, 'name', 'title');
}

function count(path: string): (row: Row) => string {
  return (row) => asString(firstOf(row, path));
}

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' · ');
}

const column = (label: string, get: (row: Row) => string): ResourceColumn => ({ label, get });

/* -------------------------------------------------------------------------- */
/*  Module definitions                                                         */
/* -------------------------------------------------------------------------- */

const CONFIGS: ResourceConfig[] = [
  {
    key: 'audit-logs',
    title: 'Recent Activity',
    subtitle: 'System activity log',
    path: '/audit-logs',
    icon: 'reports',
    // The audit-log endpoint only supports page/limit paging (no `search`),
    // so the search field is intentionally hidden.
    searchable: false,
    columns: [
      column('Action', (r) => humanize(firstOf(r, 'action'))),
      column('Entity', (r) => humanize(firstOf(r, 'entity'))),
      column('User', (r) => person(r, 'user')),
      column('When', (r) => formatDateTime(firstOf(r, 'createdAt'))),
    ],
  },
  {
    key: 'vehicles',
    title: 'Vehicle Details',
    subtitle: 'School transport fleet',
    path: '/vehicles',
    icon: 'bus',
    searchable: true,
    columns: [
      column('Plate', (r) => pick(r, 'plateNumber', 'registrationNo')),
      column('Model', (r) => pick(r, 'model', 'make')),
      column('Capacity', count('capacity')),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
  {
    key: 'exam-results',
    title: 'Student Marks',
    subtitle: 'Recorded exam results',
    path: '/exam-results',
    icon: 'marks',
    columns: [
      column('Student', (r) => person(r, 'student.user', 'student')),
      column('Exam', (r) => pick(r, 'exam.name', 'examId')),
      column('Marks', (r) => pick(r, 'marksObtained', 'marks', 'score')),
      column('Grade', (r) => pick(r, 'grade')),
    ],
  },
  {
    key: 'exams',
    title: 'Mark Management',
    subtitle: 'Exams — open a class on the web to enter marks',
    path: '/exams',
    icon: 'mark',
    searchable: true,
    columns: [
      column('Exam', (r) => pick(r, 'name')),
      column('Type', (r) => humanize(firstOf(r, 'type', 'examType'))),
      column('Date', (r) => formatDate(firstOf(r, 'date', 'startDate'))),
    ],
  },
  {
    key: 'classes',
    title: 'Classes and Sections',
    subtitle: 'Class levels',
    path: '/classes',
    icon: 'class',
    searchable: true,
    columns: [
      column('Class', nameOrTitle),
      column('Level', (r) => pick(r, 'numericLevel', 'level', 'order')),
      column('Sections', count('_count.sections')),
      column('Students', count('_count.students')),
    ],
  },
  {
    key: 'sections',
    title: 'Sections',
    path: '/sections',
    icon: 'sections',
    searchable: true,
    columns: [
      column('Section', nameOrTitle),
      column('Class', (r) => pick(r, 'classLevel.name', 'classLevelId')),
      column('Students', count('_count.students')),
    ],
  },
  {
    key: 'class-roster',
    title: 'Class Roster',
    subtitle: 'Classes with their sections and roll counts',
    path: '/classes/roster',
    icon: 'roster',
    columns: [
      column('Class', (r) => pick(r, 'name')),
      column('Level', (r) => pick(r, 'numericLevel')),
      column('Sections', (r) => asString(at(r, 'sections'))),
      column('Teacher', (r) => pick(r, 'teacher')),
      column('Students', count('studentCount')),
    ],
  },
  {
    key: 'subjects',
    title: 'Subjects',
    path: '/subjects',
    icon: 'subject',
    searchable: true,
    columns: [
      column('Subject', nameOrTitle),
      column('Code', (r) => pick(r, 'code')),
      column('Credits', (r) => pick(r, 'credits')),
    ],
  },
  {
    key: 'attendances',
    title: 'Attendance',
    path: '/attendances',
    icon: 'attendance',
    columns: [
      column('Date', (r) => formatDate(firstOf(r, 'date'))),
      column('Student', (r) => person(r, 'student.user', 'student')),
      column('Section', (r) => pick(r, 'section.name', 'sectionId')),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
  {
    key: 'homework',
    title: 'Homework',
    path: '/homework',
    icon: 'homework',
    searchable: true,
    columns: [
      column('Title', (r) => pick(r, 'title')),
      column('Subject', (r) => pick(r, 'subject.name', 'subjectId')),
      column('Section', (r) =>
        join(pick(r, 'section.classLevel.name'), pick(r, 'section.name')) || pick(r, 'sectionId'),
      ),
      column('Teacher', (r) => person(r, 'teacher.user', 'teacher')),
      column('Due', (r) => formatDate(firstOf(r, 'dueDate'))),
    ],
  },
  {
    key: 'lesson-plans',
    title: 'Lesson Plans',
    path: '/lesson-plans',
    searchable: true,
    columns: [
      column('Title', (r) => pick(r, 'title')),
      column('Subject', (r) => pick(r, 'subject.name', 'subjectId')),
      column('Class', (r) => pick(r, 'classLevel.name', 'classLevelId')),
      column('Planned', (r) => formatDate(firstOf(r, 'plannedDate'))),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
  {
    key: 'learning-content',
    title: 'Learning Content',
    path: '/learning-content',
    searchable: true,
    columns: [
      column('Title', (r) => pick(r, 'title')),
      column('Type', (r) => humanize(firstOf(r, 'type'))),
      column('Subject', (r) => pick(r, 'subject.name', 'subjectId')),
      column('Class', (r) => pick(r, 'classLevel.name', 'classLevelId')),
      column('Created', (r) => formatDate(firstOf(r, 'createdAt'))),
    ],
  },
  {
    key: 'timetable',
    title: 'Timetable',
    path: '/timetable',
    icon: 'timetable',
    columns: [
      column('Day', (r) => humanize(firstOf(r, 'dayOfWeek'))),
      column('Time', (r) => join(pick(r, 'startTime'), pick(r, 'endTime'))),
      column('Subject', (r) => pick(r, 'subject.name', 'subjectId')),
      column('Section', (r) =>
        join(pick(r, 'section.classLevel.name'), pick(r, 'section.name')) || pick(r, 'sectionId'),
      ),
      column('Teacher', (r) => person(r, 'teacher.user', 'teacher')),
      column('Room', (r) => pick(r, 'room')),
    ],
  },
  {
    key: 'admissions',
    title: 'Admissions',
    path: '/admissions',
    searchable: true,
    columns: [
      column('Applicant', (r) => pick(r, 'applicantName')),
      column('Guardian', (r) => pick(r, 'guardianName')),
      column('Phone', (r) => pick(r, 'guardianPhone')),
      column('Class', (r) => pick(r, 'classLevel.name', 'classLevelId')),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
  {
    key: 'service-requests',
    title: 'Requests',
    path: '/service-requests',
    searchable: true,
    columns: [
      column('Requester', (r) => person(r, 'requestedBy')),
      column('Type', (r) => humanize(firstOf(r, 'type'))),
      column('Title', (r) => pick(r, 'title')),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
  {
    key: 'teachers',
    title: 'Teacher Details',
    path: '/teachers',
    searchable: true,
    columns: [
      column('Teacher', (r) => person(r, 'user', 'teacher') || nameOrTitle(r)),
      column('Employee No', (r) => pick(r, 'employeeNo')),
      column('Email', (r) => pick(r, 'user.email', 'email')),
      column('Status', (r) => humanize(firstOf(r, 'status', 'employmentStatus'))),
    ],
  },
  {
    key: 'guardians',
    title: 'Parent Details',
    path: '/guardians',
    searchable: true,
    columns: [
      column('Name', (r) => person(r) || nameOrTitle(r)),
      column('Phone', (r) => pick(r, 'phone')),
      column('Email', (r) => pick(r, 'email')),
      column('Children', count('_count.children')),
    ],
  },
  {
    key: 'books',
    title: 'Books',
    path: '/books',
    searchable: true,
    columns: [
      column('Title', (r) => pick(r, 'title')),
      column('Author', (r) => pick(r, 'author')),
      column('ISBN', (r) => pick(r, 'isbn')),
      column('Copies', (r) => pick(r, 'availableCopies', 'totalCopies')),
    ],
  },
  {
    key: 'invoices',
    title: 'Fee Desk',
    subtitle: 'Invoices',
    path: '/invoices',
    searchable: true,
    icon: 'finance',
    columns: [
      column('Invoice No', (r) => pick(r, 'invoiceNo')),
      column('Student', (r) => person(r, 'student.user', 'student')),
      column('Total', (r) => formatCurrency(firstOf(r, 'total'))),
      column('Balance', (r) => formatCurrency(firstOf(r, 'balance'))),
      column('Status', (r) => humanize(firstOf(r, 'status'))),
    ],
  },
];

const BY_KEY: Record<string, ResourceConfig> = Object.fromEntries(
  CONFIGS.map((config) => [config.key, config]),
);

export function resourceConfig(key: string | undefined): ResourceConfig | null {
  if (!key) return null;
  return BY_KEY[key] ?? null;
}

export const RESOURCE_KEYS = CONFIGS.map((config) => config.key);
