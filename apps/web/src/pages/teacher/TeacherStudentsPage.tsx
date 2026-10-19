import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/ui';
import { ClassroomArt } from '../../components/illustrations';
import { humanize } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import {
  TeacherScaffold,
  fetchStudentsForSections,
  useTeacherScope,
  type TeacherStudent,
} from './teacherScope';

function studentName(student: TeacherStudent): string {
  const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
  return name || student.admissionNo;
}

export function TeacherStudentsPage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const sectionFilter = searchParams.get('section') ?? 'all';
  const scopeKey = scope ? scope.sectionIds.join(',') : '';

  const students = useAsync<TeacherStudent[]>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve([])),
    [scopeKey],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (students.data ?? []).filter((student) => {
      if (sectionFilter !== 'all' && student.section?.id !== sectionFilter) return false;
      if (!needle) return true;
      return (
        studentName(student).toLowerCase().includes(needle) ||
        student.admissionNo.toLowerCase().includes(needle) ||
        (student.rollNo ?? '').toLowerCase().includes(needle)
      );
    });
  }, [students.data, query, sectionFilter]);

  const setSection = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('section');
    else next.set('section', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <TeacherScaffold
      title="My Students"
      subtitle="Students enrolled in the sections you teach"
      icon="students"
      loading={loading || students.loading}
      error={error ?? students.error}
      forbidden={forbidden || students.forbidden}
      reload={reload}
      actions={
        <button type="button" className="btn btn--ghost" onClick={reload}>
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      }
    >
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
          <label className="field field--inline">
            <span className="field__label">Search</span>
            <input
              className="field__input field__input--compact"
              type="search"
              placeholder="Name, admission or roll no"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span className="toolbar__spacer" />
          <span className="muted">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          students.data && students.data.length === 0 ? (
            <EmptyState
              message="No students are enrolled in your sections yet."
              hint="Students appear here once an administrator enrols them into the classes you teach."
              icon="students"
              illustration={<ClassroomArt />}
            />
          ) : (
            <EmptyState message="No students match your filters." icon="students" />
          )
        ) : (
          <div className="table-wrap table-wrap--responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Gender</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>{student.admissionNo}</td>
                    <td>{studentName(student)}</td>
                    <td>{student.rollNo ?? '—'}</td>
                    <td>{student.section?.classLevel?.name ?? '—'}</td>
                    <td>{student.section?.name ?? '—'}</td>
                    <td>{humanize(student.gender) || '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          student.status === 'ACTIVE' ? 'badge--success' : 'badge--default'
                        }`}
                      >
                        {humanize(student.status)}
                      </span>
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
