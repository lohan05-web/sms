import { attendanceIndicatorLabel } from '@smartschool/shared';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, StatCard } from '../../components/ui';
import { AnalyticsArt } from '../../components/illustrations';
import { useAsync } from '../../lib/useAsync';
import {
  TeacherScaffold,
  fetchAttendanceSummary,
  mergeAttendanceSummaries,
  useTeacherScope,
  type AttendanceSummary,
} from './teacherScope';
import { AttendanceBars } from './teacherWidgets';

const EMPTY_SUMMARY: AttendanceSummary = {
  period: { kind: 'range', from: '', to: '', label: '' },
  overall: { total: 0, present: 0, absent: 0, late: 0, excused: 0, halfDay: 0, percentage: 0, indicator: 'good' },
  students: [],
};

const INDICATOR_BADGE: Record<string, string> = {
  good: 'badge badge--success',
  warning: 'badge badge--warning',
  critical: 'badge badge--danger',
};

export function TeacherAttendancePage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionFilter = searchParams.get('section') ?? 'all';
  const scopeKey = scope ? scope.sectionIds.join(',') : '';

  const summary = useAsync<AttendanceSummary>(() => {
    if (!scope) return Promise.resolve(EMPTY_SUMMARY);
    const ids = sectionFilter === 'all' ? scope.sectionIds : [sectionFilter];
    if (ids.length === 0) return Promise.resolve(EMPTY_SUMMARY);
    return Promise.all(ids.map(fetchAttendanceSummary)).then(mergeAttendanceSummaries);
  }, [scopeKey, sectionFilter]);

  const data = summary.data ?? EMPTY_SUMMARY;
  const overall = data.overall;

  const byStatus = useMemo(
    () => ({
      PRESENT: overall.present,
      ABSENT: overall.absent,
      LATE: overall.late,
      EXCUSED: overall.excused,
      HALF_DAY: overall.halfDay,
    }),
    [overall],
  );

  const setSection = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('section');
    else next.set('section', value);
    setSearchParams(next, { replace: true });
  };

  const today = scope?.attendance?.today;

  return (
    <TeacherScaffold
      title="Attendance"
      subtitle="Attendance across the sections you teach"
      icon="attendance"
      loading={loading || summary.loading}
      error={error ?? summary.error}
      forbidden={forbidden || summary.forbidden}
      reload={reload}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={reload}>
            <Icon name="refresh" size={16} />
            Refresh
          </button>
          <Link className="btn btn--primary" to="/attendance/mark">
            <Icon name="check" size={16} />
            Mark attendance
          </Link>
        </>
      }
    >
      <section className="stat-grid" aria-label="Attendance summary">
        <StatCard
          label="Overall attendance"
          value={`${overall.percentage}%`}
          hint={attendanceIndicatorLabel(overall.indicator)}
          icon="trending"
          tone={overall.indicator === 'good' ? 'success' : overall.indicator === 'warning' ? 'warning' : 'danger'}
        />
        <StatCard
          label="Present"
          value={overall.present}
          hint={`of ${overall.total} marks`}
          icon="check"
          tone="success"
        />
        <StatCard label="Absent" value={overall.absent} hint="All-time" icon="alert" tone="danger" />
        <StatCard label="Late" value={overall.late} hint="All-time" icon="attendance" tone="warning" />
        <StatCard
          label="Today"
          value={`${today?.percentage ?? 0}%`}
          hint={today ? `${today.total} marks today` : 'Not marked yet'}
          icon="attendance"
          tone="info"
        />
      </section>

      <section className="panel">
        <div className="toolbar toolbar--inline">
          <label className="field field--inline">
            <span className="field__label">Section</span>
            <select
              className="field__input field__input--compact"
              value={sectionFilter}
              onChange={(event) => setSection(event.target.value)}
            >
              <option value="all">All my classes</option>
              {(scope?.sections ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {section.classLevelName ? `${section.classLevelName} · ` : ''}
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <span className="toolbar__spacer" />
          <span className="muted">
            {data.students.length} student{data.students.length === 1 ? '' : 's'}
            {data.period.label ? ` · ${data.period.label}` : ''}
          </span>
        </div>

        <div className="teacher-split">
          <div className="teacher-chart-card">
            <h3 className="teacher-chart-card__title">Status breakdown</h3>
            <AttendanceBars counts={byStatus} />
          </div>
          <div className="teacher-chart-card">
            <h3 className="teacher-chart-card__title">Attendance by student</h3>
            {data.students.length === 0 ? (
              <EmptyState
                message="No attendance has been recorded yet."
                hint="Open Mark attendance to take the register for one of your sections — the summary fills in from there."
                icon="attendance"
                illustration={<AnalyticsArt />}
              />
            ) : (
              <div className="table-wrap table-wrap--responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>P</th>
                      <th>A</th>
                      <th>L</th>
                      <th>%</th>
                      <th>Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student) => (
                      <tr key={student.studentId}>
                        <td>
                          <strong>{student.name}</strong>
                          <div className="muted">{student.admissionNo}</div>
                        </td>
                        <td>
                          {[student.className, student.sectionName].filter(Boolean).join(' · ') ||
                            '—'}
                        </td>
                        <td>{student.present}</td>
                        <td>{student.absent}</td>
                        <td>{student.late}</td>
                        <td>{student.percentage}%</td>
                        <td>
                          <span className={INDICATOR_BADGE[student.indicator] ?? 'badge badge--default'}>
                            {attendanceIndicatorLabel(student.indicator)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </TeacherScaffold>
  );
}
