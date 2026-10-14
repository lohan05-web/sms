import {
  ATTENDANCE_STATUS_LABELS,
  Permission,
  type AttendanceDayEntry,
  type AttendanceSummary,
  type AttendanceSummaryStudent,
  type Role,
} from '@smartschool/shared';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, PageHeader, Spinner, StatCard } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  hasScope,
  indicatorLabel,
  indicatorTone,
  monthOptions,
  trackerQueryString,
  type TrackerFilters,
} from '../lib/attendanceTracker';
import { formatDate } from '../lib/format';
import { can } from '../lib/permissions';
import { useLookups, type Option } from '../lib/options';
import { useAsync } from '../lib/useAsync';
import type { Row } from '../resources';
import { ForbiddenPage } from './ForbiddenPage';

const SECTION_LIMIT = 100;

function sectionLabel(row: Row): string {
  const cls = row.classLevel as Row | undefined;
  const className = cls ? String(cls.name ?? '') : '';
  const name = String(row.name ?? '');
  return className ? `${className} · ${name}` : name;
}

function studentLabel(row: Row): string {
  const user = row.user as Row | undefined;
  const name = user ? `${String(user.firstName ?? '')} ${String(user.lastName ?? '')}`.trim() : '';
  const admission = String(row.admissionNo ?? '');
  if (name && admission) return `${name} (${admission})`;
  return name || admission || String(row.id ?? '');
}

function DayStrip({ days }: { days: AttendanceDayEntry[] }) {
  if (days.length === 0) return <span className="muted">No records in this period.</span>;
  return (
    <div className="day-strip">
      {days.map((day) => (
        <span
          key={day.date}
          className={`day-chip day-chip--${day.status.toLowerCase()}`}
          title={`${formatDate(day.date)} · ${ATTENDANCE_STATUS_LABELS[day.status]}`}
        >
          {Number(day.date.slice(8, 10))}
        </span>
      ))}
    </div>
  );
}

function Percentage({ value, tone }: { value: number; tone: string }) {
  return <span className={`attendance-pct attendance-pct--${tone}`}>{value}%</span>;
}

function StudentTable({ students }: { students: AttendanceSummaryStudent[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (students.length === 0) {
    return <EmptyState message="No students found for this selection." />;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Section</th>
            <th>Present</th>
            <th>Absent</th>
            <th>On leave</th>
            <th>Late</th>
            <th>Attendance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const tone = indicatorTone(student.indicator);
            const isOpen = expanded === student.studentId;
            return (
              <FragmentRow
                key={student.studentId}
                student={student}
                tone={tone}
                isOpen={isOpen}
                onToggle={() => setExpanded(isOpen ? null : student.studentId)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  student,
  tone,
  isOpen,
  onToggle,
}: {
  student: AttendanceSummaryStudent;
  tone: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="tracker-row"
        onClick={onToggle}
        aria-expanded={isOpen}
        title="Show daily attendance"
      >
        <td>
          <strong>{student.name}</strong>
          <div className="muted">{student.admissionNo}</div>
        </td>
        <td>{student.className ?? '—'}</td>
        <td>{student.sectionName ?? '—'}</td>
        <td>{student.present}</td>
        <td>{student.absent}</td>
        <td>{student.excused}</td>
        <td>{student.late}</td>
        <td>
          <Percentage value={student.percentage} tone={tone} />
        </td>
        <td>
          <span className={`badge badge--${tone}`}>{indicatorLabel(student.indicator)}</span>
        </td>
      </tr>
      {isOpen ? (
        <tr className="tracker-detail">
          <td colSpan={9}>
            <DayStrip days={student.days} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AttendanceTrackerPage() {
  const { user } = useAuth();
  if (!user || !can(user.role, Permission.ATTENDANCE_READ)) {
    return <ForbiddenPage />;
  }
  return <AttendanceTrackerView role={user.role} />;
}

function AttendanceTrackerView({ role }: { role: Role }) {
  const { options } = useLookups(['classes', 'terms']);
  const months = monthOptions(12, new Date());

  const [classLevelId, setClassLevelId] = useState('');
  const [sections, setSections] = useState<Option[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState<Option[]>([]);
  const [studentId, setStudentId] = useState('');
  const [periodMode, setPeriodMode] = useState<'month' | 'term'>('month');
  const [month, setMonth] = useState(months[0]?.value ?? '');
  const [termId, setTermId] = useState('');

  useEffect(() => {
    let active = true;
    setSectionsLoading(true);
    setSectionId('');
    api
      .list<Row>('/sections', { classLevelId: classLevelId || undefined, limit: SECTION_LIMIT })
      .then(({ items }) => {
        if (!active) return;
        setSections(
          items
            .map((row) => ({ value: String(row.id ?? ''), label: sectionLabel(row) }))
            .filter((option) => option.value !== ''),
        );
      })
      .catch(() => {
        if (active) setSections([]);
      })
      .finally(() => {
        if (active) setSectionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classLevelId]);

  useEffect(() => {
    let active = true;
    setStudentId('');
    if (!sectionId) {
      setStudents([]);
      return () => {
        active = false;
      };
    }
    api
      .list<Row>('/students', { sectionId, status: 'ACTIVE', limit: SECTION_LIMIT })
      .then(({ items }) => {
        if (!active) return;
        setStudents(
          items
            .map((row) => ({ value: String(row.id ?? ''), label: studentLabel(row) }))
            .filter((option) => option.value !== ''),
        );
      })
      .catch(() => {
        if (active) setStudents([]);
      });
    return () => {
      active = false;
    };
  }, [sectionId]);

  const filters: TrackerFilters = {
    classLevelId: classLevelId || undefined,
    sectionId: sectionId || undefined,
    studentId: studentId || undefined,
    ...(periodMode === 'month' ? { month: month || undefined } : { termId: termId || undefined }),
  };
  const ready =
    hasScope(filters) && (periodMode === 'month' ? Boolean(month) : Boolean(termId));
  const query = trackerQueryString(filters);

  const summary = useAsync<AttendanceSummary | null>(
    () => (ready ? api.get<AttendanceSummary>(`/attendances/summary?${query}`) : Promise.resolve(null)),
    [query, ready],
  );

  const canMark = can(role, Permission.ATTENDANCE_MARK);

  return (
    <div className="page">
      <PageHeader
        title="Attendance Tracker"
        subtitle="Daily status and monthly / term attendance percentages with at-a-glance indicators"
        actions={
          canMark ? (
            <a className="btn btn--ghost" href="/attendance/mark">
              Mark attendance
            </a>
          ) : undefined
        }
      />

      <form className="toolbar toolbar--wrap" onSubmit={(event) => event.preventDefault()}>
        <select
          className="field__input"
          aria-label="Class"
          value={classLevelId}
          onChange={(event) => setClassLevelId(event.target.value)}
        >
          <option value="">All classes</option>
          {(options.classes ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="field__input"
          aria-label="Section"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          disabled={sectionsLoading}
        >
          <option value="">{sectionsLoading ? 'Loading sections…' : '— Select section —'}</option>
          {sections.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="field__input"
          aria-label="Student"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          disabled={!sectionId}
        >
          <option value="">All students</option>
          {students.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="field__input"
          aria-label="Period type"
          value={periodMode}
          onChange={(event) => setPeriodMode(event.target.value as 'month' | 'term')}
        >
          <option value="month">Monthly</option>
          <option value="term">Term</option>
        </select>

        {periodMode === 'month' ? (
          <select
            className="field__input"
            aria-label="Month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            {months.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="field__input"
            aria-label="Term"
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
          >
            <option value="">— Select term —</option>
            {(options.terms ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </form>

      <div className="tracker-legend">
        <span className="tracker-legend__item">
          <span className="tracker-legend__swatch tracker-legend__swatch--good" /> 85% and above
        </span>
        <span className="tracker-legend__item">
          <span className="tracker-legend__swatch tracker-legend__swatch--warning" /> 75% – 84%
        </span>
        <span className="tracker-legend__item">
          <span className="tracker-legend__swatch tracker-legend__swatch--critical" /> Below 75%
        </span>
      </div>

      {!ready ? (
        <EmptyState message="Choose a class or section and a period to see attendance." />
      ) : summary.loading ? (
        <Spinner label="Loading attendance…" />
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.reload} />
      ) : summary.data ? (
        <>
          <section className="panel">
            <h2 className="panel__title">Overview · {summary.data.period.label}</h2>
            <div className="stat-grid">
              <StatCard
                label="Attendance"
                value={
                  <Percentage
                    value={summary.data.overall.percentage}
                    tone={indicatorTone(summary.data.overall.indicator)}
                  />
                }
                hint={indicatorLabel(summary.data.overall.indicator)}
              />
              <StatCard label="Present" value={summary.data.overall.present} />
              <StatCard label="Absent" value={summary.data.overall.absent} />
              <StatCard label="On leave" value={summary.data.overall.excused} />
              <StatCard label="Late arrival" value={summary.data.overall.late} />
              <StatCard label="Records" value={summary.data.overall.total} />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Per-student attendance</h2>
            <p className="muted">Select a student to expand their daily attendance.</p>
            <StudentTable students={summary.data.students} />
          </section>
        </>
      ) : null}
    </div>
  );
}
