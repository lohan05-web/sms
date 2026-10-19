import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { EmptyState, StatCard } from '../../components/ui';
import { AnalyticsArt } from '../../components/illustrations';
import { useAsync } from '../../lib/useAsync';
import {
  TeacherScaffold,
  fetchResultsForClassLevels,
  fetchStudentsForSections,
  useTeacherScope,
  type ExamResultItem,
  type TeacherStudent,
} from './teacherScope';

function studentName(student: TeacherStudent | null | undefined, fallbackId: string): string {
  if (!student) return fallbackId;
  const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
  return name || student.admissionNo;
}

export function TeacherMarksPage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const scopeKey = scope ? scope.sectionIds.join(',') : '';
  const classLevelKey = scope ? scope.classLevelIds.join(',') : '';

  const results = useAsync<ExamResultItem[]>(
    () => (scope ? fetchResultsForClassLevels(scope.classLevelIds) : Promise.resolve([])),
    [classLevelKey],
  );
  const students = useAsync<TeacherStudent[]>(
    () => (scope ? fetchStudentsForSections(scope.sectionIds) : Promise.resolve([])),
    [scopeKey],
  );

  const [classLevelFilter, setClassLevelFilter] = useState('all');
  const [examFilter, setExamFilter] = useState('all');

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students.data ?? []) map.set(student.id, studentName(student, student.admissionNo));
    return map;
  }, [students.data]);

  const exams = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of results.data ?? []) {
      if (result.exam?.id) map.set(result.exam.id, result.exam.name ?? 'Exam');
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [results.data]);

  const filtered = useMemo(() => {
    return (results.data ?? []).filter((result) => {
      if (classLevelFilter !== 'all' && result.exam?.classLevelId !== classLevelFilter) return false;
      if (examFilter !== 'all' && result.exam?.id !== examFilter) return false;
      return true;
    });
  }, [results.data, classLevelFilter, examFilter]);

  const average = useMemo(() => {
    const scored = filtered.filter((result) => (result.exam?.maxMarks ?? 0) > 0);
    if (scored.length === 0) return 0;
    const ratio =
      scored.reduce(
        (sum, result) => sum + result.marksObtained / (result.exam?.maxMarks ?? 1),
        0,
      ) / scored.length;
    return Math.round(ratio * 1000) / 10;
  }, [filtered]);

  return (
    <TeacherScaffold
      title="Marks & Grades"
      subtitle="Exam results for the classes you teach"
      icon="marks"
      loading={loading || results.loading || students.loading}
      error={error ?? results.error ?? students.error}
      forbidden={forbidden || results.forbidden || students.forbidden}
      reload={reload}
      actions={
        <Link className="btn btn--primary" to="/exams/marks">
          <Icon name="mark" size={16} />
          Enter marks
        </Link>
      }
    >
      <section className="stat-grid" aria-label="Marks summary">
        <StatCard label="Results" value={filtered.length} hint="Recorded marks" icon="marks" />
        <StatCard label="Average" value={`${average}%`} hint="Across shown results" icon="trending" tone="success" />
        <StatCard label="Exams" value={exams.length} hint="In your classes" icon="roster" tone="info" />
        <StatCard label="Class levels" value={scope?.classLevelIds.length ?? 0} hint="You teach" icon="class" tone="warning" />
      </section>

      <section className="panel">
        <div className="toolbar toolbar--inline">
          <label className="field field--inline">
            <span className="field__label">Class</span>
            <select
              className="field__input field__input--compact"
              value={classLevelFilter}
              onChange={(event) => setClassLevelFilter(event.target.value)}
            >
              <option value="all">All my classes</option>
              {(scope?.classLevels ?? []).map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline">
            <span className="field__label">Exam</span>
            <select
              className="field__input field__input--compact"
              value={examFilter}
              onChange={(event) => setExamFilter(event.target.value)}
            >
              <option value="all">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
          <span className="toolbar__spacer" />
          <span className="muted">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            message="No exam results have been recorded for your classes yet."
            hint="Use Enter marks to record scores for your students — they appear here immediately."
            icon="marks"
            illustration={<AnalyticsArt />}
          />
        ) : (
          <div className="table-wrap table-wrap--responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((result) => (
                  <tr key={result.id}>
                    <td>
                      <strong>
                        {nameById.get(result.student?.id ?? '') ??
                          result.student?.admissionNo ??
                          '—'}
                      </strong>
                      {result.student?.admissionNo ? (
                        <div className="muted">{result.student.admissionNo}</div>
                      ) : null}
                    </td>
                    <td>{result.exam?.name ?? '—'}</td>
                    <td>{result.subject?.name ?? '—'}</td>
                    <td>
                      {result.marksObtained}
                      {result.exam?.maxMarks ? (
                        <span className="muted"> / {result.exam.maxMarks}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge badge--info">{result.grade ?? '—'}</span>
                    </td>
                    <td>{result.remarks || '—'}</td>
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
