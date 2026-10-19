import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, StatCard } from '../../components/ui';
import { LearningArt } from '../../components/illustrations';
import {
  TeacherScaffold,
  useTeacherScope,
  type TeacherAssignment,
} from './teacherScope';

interface AssignmentRow extends TeacherAssignment {
  periods: number;
}

export function TeacherAssignmentsPage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const [subjectFilter, setSubjectFilter] = useState('all');

  const rows = useMemo<AssignmentRow[]>(() => {
    if (!scope) return [];
    return scope.assignments
      .map((assignment) => ({
        ...assignment,
        periods: scope.timetableEntries.filter(
          (entry) =>
            entry.subject?.id === assignment.subject?.id &&
            entry.section?.id === assignment.section?.id,
        ).length,
      }))
      .sort((a, b) => {
        const left = `${a.section?.classLevel?.name ?? ''}${a.section?.name ?? ''}${a.subject?.name ?? ''}`;
        const right = `${b.section?.classLevel?.name ?? ''}${b.section?.name ?? ''}${b.subject?.name ?? ''}`;
        return left.localeCompare(right, undefined, { numeric: true });
      });
  }, [scope]);

  const filtered = useMemo(
    () => (subjectFilter === 'all' ? rows : rows.filter((row) => row.subject?.id === subjectFilter)),
    [rows, subjectFilter],
  );

  const sectionCount = scope?.sections.length ?? 0;
  const subjectCount = scope?.subjects.length ?? 0;

  return (
    <TeacherScaffold
      title="Assignments"
      subtitle="The class–subject assignments allocated to you"
      icon="subject"
      loading={loading}
      error={error}
      forbidden={forbidden}
      reload={reload}
      actions={
        <Link className="btn btn--ghost" to="/teacher/timetable">
          <Icon name="timetable" size={16} />
          View timetable
        </Link>
      }
    >
      <section className="stat-grid" aria-label="Assignment summary">
        <StatCard label="Assignments" value={rows.length} hint="Class–subject pairs" icon="subject" />
        <StatCard label="Classes" value={sectionCount} hint="Sections you teach" icon="sections" tone="info" />
        <StatCard label="Subjects" value={subjectCount} hint="Distinct subjects" icon="class" tone="success" />
        <StatCard
          label="Weekly periods"
          value={scope?.timetableEntries.length ?? 0}
          hint="Across all sections"
          icon="timetable"
          tone="warning"
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2 className="panel__title">Teaching assignments</h2>
          <label className="field field--inline">
            <span className="field__label">Subject</span>
            <select
              className="field__input field__input--compact"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              <option value="all">All subjects</option>
              {(scope?.subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            message="You have no teaching assignments yet."
            hint="The class and subject pairs an administrator allocates to you will be listed here."
            icon="subject"
            illustration={<LearningArt />}
          />
        ) : (
          <div className="table-wrap table-wrap--responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Academic year</th>
                  <th>Periods / week</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>{row.section?.classLevel?.name ?? '—'}</td>
                    <td>{row.section?.name ?? '—'}</td>
                    <td>
                      <strong>{row.subject?.name ?? '—'}</strong>
                      {row.subject?.code ? <div className="muted">{row.subject.code}</div> : null}
                    </td>
                    <td>{row.academicYear?.name ?? '—'}</td>
                    <td>{row.periods}</td>
                    <td className="table__actions">
                      <Link className="btn btn--ghost btn--sm" to="/teacher/homework">
                        Homework
                      </Link>
                      <Link className="btn btn--ghost btn--sm" to="/teacher/marks">
                        Marks
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </TeacherScaffold>
  );
}
