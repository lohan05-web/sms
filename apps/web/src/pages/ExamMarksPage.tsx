import { Permission, type Role } from '@smartschool/shared';
import { useEffect, useState } from 'react';
import type { Row } from '../resources';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  MAX_MARKS,
  applyMarksPlan,
  buildMarks,
  compareStudents,
  isValidMarks,
  planMarks,
  summarizeMarks,
  toExistingResult,
  toMarksStudent,
  type ExistingResult,
  type MarksEntry,
  type MarksResult,
  type MarksStudent,
  type MarksSummary,
} from '../lib/examMarks';
import { can, canAny } from '../lib/permissions';
import { useLookups } from '../lib/options';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

const ROSTER_LIMIT = 100;

interface ExamChoice {
  id: string;
  label: string;
  classLevelId: string;
}

function examLabel(row: Row): string {
  const cls = row.classLevel as Row | undefined;
  const clsName = cls ? String(cls.name ?? '') : '';
  const name = String(row.name ?? '');
  return clsName ? `${name} · ${clsName}` : name;
}

export function ExamMarksPage() {
  const { user } = useAuth();
  if (!user || !canAny(user.role, [Permission.RESULT_READ, Permission.RESULT_MANAGE])) {
    return <ForbiddenPage />;
  }
  return <ExamMarksView role={user.role} />;
}

function ExamMarksView({ role }: { role: Role }) {
  const { options: subjectOptions } = useLookups(['subjects']);
  const [exams, setExams] = useState<ExamChoice[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  useEffect(() => {
    let active = true;
    setExamsLoading(true);
    api
      .list<Row>('/exams', { limit: ROSTER_LIMIT })
      .then(({ items }) => {
        if (!active) return;
        setExams(
          items
            .map((row) => ({
              id: String(row.id ?? ''),
              label: examLabel(row) || String(row.id ?? ''),
              classLevelId: String(row.classLevelId ?? ''),
            }))
            .filter((exam) => exam.id !== ''),
        );
      })
      .catch(() => {
        if (active) setExams([]);
      })
      .finally(() => {
        if (active) setExamsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedExam = exams.find((exam) => exam.id === examId);
  const classLevelId = selectedExam?.classLevelId ?? '';
  const ready = Boolean(examId) && Boolean(subjectId) && Boolean(classLevelId);

  const roster = useAsync<{
    students: MarksStudent[];
    existing: ExistingResult[];
  } | null>(async () => {
    if (!ready || !classLevelId) return null;
    const sections = await api.list<Row>('/sections', { classLevelId, limit: ROSTER_LIMIT });
    const studentLists = await Promise.all(
      sections.items.map((section) =>
        api.list<Row>('/students', {
          sectionId: String(section.id ?? ''),
          status: 'ACTIVE',
          limit: ROSTER_LIMIT,
        }),
      ),
    );
    const students = studentLists.flatMap((list) => list.items.map(toMarksStudent));
    const results = await api.list<Row>('/exam-results', { examId, limit: ROSTER_LIMIT });
    const existing = results.items
      .map(toExistingResult)
      .filter((result) => result.subjectId === subjectId);
    return { students: students.sort(compareStudents), existing };
  }, [examId, subjectId, classLevelId, ready]);

  return (
    <div className="page">
      <PageHeader
        title="Exam Marks Entry"
        subtitle="Record subject marks for every student in an exam"
      />

      <form className="toolbar toolbar--wrap" onSubmit={(event) => event.preventDefault()}>
        <select
          className="field__input"
          aria-label="Exam"
          value={examId}
          onChange={(event) => setExamId(event.target.value)}
          disabled={examsLoading}
        >
          <option value="">{examsLoading ? 'Loading exams…' : '— Select exam —'}</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.label}
            </option>
          ))}
        </select>

        <select
          className="field__input"
          aria-label="Subject"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
        >
          <option value="">— Select subject —</option>
          {(subjectOptions.subjects ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </form>

      {!examId || !subjectId ? (
        <EmptyState message="Choose an exam and subject to load the roster." />
      ) : !classLevelId ? (
        <div className="alert alert--error">This exam is not linked to a class level.</div>
      ) : roster.loading ? (
        <Spinner label="Loading roster…" />
      ) : roster.error ? (
        <ErrorState message={roster.error} onRetry={roster.reload} />
      ) : roster.data && roster.data.students.length === 0 ? (
        <EmptyState message="No active students found in this class level." />
      ) : roster.data ? (
        <MarksEditor
          key={`${examId}-${subjectId}`}
          examId={examId}
          subjectId={subjectId}
          students={roster.data.students}
          existing={roster.data.existing}
          canSave={can(role, Permission.RESULT_MANAGE)}
        />
      ) : null}
    </div>
  );
}

function MarksEditor({
  examId,
  subjectId,
  students,
  existing,
  canSave,
}: {
  examId: string;
  subjectId: string;
  students: MarksStudent[];
  existing: ExistingResult[];
  canSave: boolean;
}) {
  const [entries, setEntries] = useState<MarksEntry[]>(() => buildMarks(students, existing));
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<MarksSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (studentId: string, patch: Partial<MarksEntry>) =>
    setEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, ...patch } : entry)),
    );

  const handleSave = async () => {
    setError(null);
    setSummary(null);
    const { plans, errors } = planMarks(entries, { canSave });
    if (errors.length > 0) {
      setError(
        `Fix ${errors.length} invalid marks field${errors.length === 1 ? '' : 's'}: ${errors
          .map((item) => item.name || item.studentId)
          .join(', ')}`,
      );
      return;
    }
    if (plans.length === 0) {
      setError(
        canSave ? 'No changes to save.' : 'You do not have permission to record exam marks.',
      );
      return;
    }
    setSaving(true);
    setProgress({ done: 0, total: plans.length });
    const results: MarksResult[] = [];
    let nextEntries = entries;
    try {
      for (const plan of plans) {
        const optional = { grade: plan.grade || undefined, remarks: plan.remark || undefined };
        try {
          if (plan.kind === 'create') {
            const created = await api.post<{ id: string }>('/exam-results', {
              examId,
              studentId: plan.studentId,
              subjectId,
              marksObtained: plan.marks,
              ...optional,
            });
            nextEntries = applyMarksPlan(nextEntries, plan, created?.id);
          } else {
            await api.patch(`/exam-results/${plan.id}`, {
              marksObtained: plan.marks,
              ...optional,
            });
            nextEntries = applyMarksPlan(nextEntries, plan);
          }
          results.push({ plan, ok: true });
        } catch (err) {
          results.push({
            plan,
            ok: false,
            message: err instanceof Error ? err.message : 'Failed',
          });
        }
        setProgress({ done: results.length, total: plans.length });
      }
      setEntries(nextEntries);
      setSummary(summarizeMarks(results));
    } finally {
      setSaving(false);
    }
  };

  const recordedCount = entries.filter((entry) => entry.existingId).length;
  const enteredCount = entries.filter((entry) => entry.marks.trim() !== '').length;

  return (
    <section className="panel">
      <div className="toolbar toolbar--inline toolbar--wrap roster-toolbar">
        <span className="panel__meta">
          {entries.length} students · {enteredCount} marks entered · {recordedCount} recorded · out
          of {MAX_MARKS}
        </span>
        <span className="toolbar__spacer" />
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'Saving…' : 'Save marks'}
        </button>
      </div>

      {!canSave ? (
        <div className="alert alert--error">
          You can view these marks but do not have permission to record them.
        </div>
      ) : null}
      {error ? <div className="alert alert--error">{error}</div> : null}
      {saving && progress ? (
        <div className="alert">
          Saving {progress.done}/{progress.total}…
        </div>
      ) : null}
      {summary ? (
        <div
          className={summary.failed.length > 0 ? 'alert alert--error' : 'alert alert--success'}
          role="status"
        >
          Saved {summary.created} new and {summary.updated} updated.
          {summary.failed.length > 0
            ? ` ${summary.failed.length} failed: ${summary.failed
                .map((item) => `${item.name} (${item.message})`)
                .join('; ')}`
            : ''}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Roll</th>
              <th>Student</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const invalid = !isValidMarks(entry.marks);
              const label = entry.name || entry.admissionNo;
              return (
                <tr key={entry.studentId}>
                  <td>{entry.rollNo || entry.admissionNo || '—'}</td>
                  <td>
                    {label}
                    {entry.existingId ? (
                      <span className="badge roster__recorded">Recorded</span>
                    ) : null}
                  </td>
                  <td>
                    <input
                      className="field__input field__input--compact"
                      type="number"
                      min={0}
                      max={MAX_MARKS}
                      step={1}
                      aria-label={`Marks for ${label}`}
                      aria-invalid={invalid}
                      value={entry.marks}
                      placeholder="—"
                      disabled={!canSave || saving}
                      onChange={(event) => update(entry.studentId, { marks: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field__input field__input--compact"
                      aria-label={`Grade for ${label}`}
                      value={entry.grade}
                      maxLength={5}
                      placeholder="Optional"
                      disabled={!canSave || saving}
                      onChange={(event) => update(entry.studentId, { grade: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field__input field__input--compact"
                      aria-label={`Remark for ${label}`}
                      value={entry.remark}
                      maxLength={255}
                      placeholder="Optional"
                      disabled={!canSave || saving}
                      onChange={(event) => update(entry.studentId, { remark: event.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
