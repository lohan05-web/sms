import { Permission, type Role } from '@smartschool/shared';
import { useEffect, useState } from 'react';
import type { Row } from '../resources';
import { ErrorState, EmptyState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_STATUS,
  applyPlan,
  buildRoster,
  compareStudents,
  isFutureDate,
  planChanges,
  summarizeResults,
  today,
  toExistingAttendance,
  toRosterStudent,
  type AttendanceStatusValue,
  type ChangeResult,
  type ExistingAttendance,
  type RosterEntry,
  type RosterStudent,
  type SaveSummary,
} from '../lib/attendance';
import { humanize } from '../lib/format';
import { can, canAny } from '../lib/permissions';
import { useLookups, type Option } from '../lib/options';
import { useAsync } from '../lib/useAsync';
import { ForbiddenPage } from './ForbiddenPage';

const ROSTER_LIMIT = 100;

function sectionLabel(row: Row): string {
  const cls = row.classLevel as Row | undefined;
  const clsName = cls ? String(cls.name ?? '') : '';
  const name = String(row.name ?? '');
  return clsName ? `${clsName} · ${name}` : name;
}

export function AttendanceMarkPage() {
  const { user } = useAuth();
  if (
    !user ||
    !canAny(user.role, [
      Permission.ATTENDANCE_READ,
      Permission.ATTENDANCE_MARK,
      Permission.ATTENDANCE_MANAGE,
    ])
  ) {
    return <ForbiddenPage />;
  }
  return <AttendanceMarkView role={user.role} />;
}

function AttendanceMarkView({ role }: { role: Role }) {
  const { options } = useLookups(['classes']);
  const [classLevelId, setClassLevelId] = useState('');
  const [sections, setSections] = useState<Option[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(today());

  useEffect(() => {
    let active = true;
    setSectionsLoading(true);
    setSectionId('');
    api
      .list<Row>('/sections', { classLevelId: classLevelId || undefined, limit: ROSTER_LIMIT })
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

  const futureDate = isFutureDate(date);
  const ready = Boolean(sectionId) && Boolean(date) && !futureDate;

  const roster = useAsync<{
    students: RosterStudent[];
    existing: ExistingAttendance[];
  } | null>(async () => {
    if (!ready) return null;
    const [students, existing] = await Promise.all([
      api.list<Row>('/students', { sectionId, status: 'ACTIVE', limit: ROSTER_LIMIT }),
      api.list<Row>('/attendances', { sectionId, date, limit: ROSTER_LIMIT }),
    ]);
    return {
      students: students.items.map(toRosterStudent).sort(compareStudents),
      existing: existing.items.map(toExistingAttendance),
    };
  }, [sectionId, date, ready]);

  return (
    <div className="page">
      <PageHeader
        title="Mark Attendance"
        subtitle="Record daily attendance for a class section, one student at a time"
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

        <input
          className="field__input"
          type="date"
          aria-label="Date"
          max={today()}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </form>

      {futureDate ? (
        <div className="alert alert--error">Attendance cannot be marked in the future.</div>
      ) : null}

      {!sectionId || !date ? (
        <EmptyState message="Choose a section and date to load the roster." />
      ) : roster.loading ? (
        <Spinner label="Loading roster…" />
      ) : roster.error ? (
        <ErrorState message={roster.error} onRetry={roster.reload} />
      ) : roster.data && roster.data.students.length === 0 ? (
        <EmptyState message="No active students found in this section." />
      ) : roster.data ? (
        <RosterEditor
          key={`${sectionId}-${date}`}
          sectionId={sectionId}
          date={date}
          students={roster.data.students}
          existing={roster.data.existing}
          canCreate={can(role, Permission.ATTENDANCE_MARK)}
          canUpdate={can(role, Permission.ATTENDANCE_MANAGE)}
        />
      ) : null}
    </div>
  );
}

function RosterEditor({
  sectionId,
  date,
  students,
  existing,
  canCreate,
  canUpdate,
}: {
  sectionId: string;
  date: string;
  students: RosterStudent[];
  existing: ExistingAttendance[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const [entries, setEntries] = useState<RosterEntry[]>(() => buildRoster(students, existing));
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatusValue>(DEFAULT_ATTENDANCE_STATUS);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<SaveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSave = canCreate || canUpdate;

  const setStatus = (studentId: string, status: AttendanceStatusValue) =>
    setEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, status } : entry)),
    );

  const setRemark = (studentId: string, remark: string) =>
    setEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, remark } : entry)),
    );

  const applyToAll = () =>
    setEntries((prev) =>
      prev.map((entry) => {
        const editable = entry.existingId ? canUpdate : canCreate;
        return editable ? { ...entry, status: bulkStatus } : entry;
      }),
    );

  const handleSave = async () => {
    setError(null);
    setSummary(null);
    const plans = planChanges(entries, { canCreate, canUpdate });
    if (plans.length === 0) {
      setError(
        canSave
          ? 'No changes to save.'
          : 'You do not have permission to record or update attendance.',
      );
      return;
    }
    setSaving(true);
    setProgress({ done: 0, total: plans.length });
    const results: ChangeResult[] = [];
    let nextEntries = entries;
    try {
      for (const plan of plans) {
        const remark = plan.remark.trim();
        try {
          if (plan.kind === 'create') {
            const created = await api.post<{ id: string }>('/attendances', {
              studentId: plan.studentId,
              sectionId,
              date,
              status: plan.status,
              remark: remark || undefined,
            });
            nextEntries = applyPlan(nextEntries, plan, created?.id);
          } else {
            await api.patch(`/attendances/${plan.id}`, {
              status: plan.status,
              remark: remark || undefined,
            });
            nextEntries = applyPlan(nextEntries, plan);
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
      setSummary(summarizeResults(results));
    } finally {
      setSaving(false);
    }
  };

  const editableCount = entries.filter((entry) =>
    entry.existingId ? canUpdate : canCreate,
  ).length;

  return (
    <section className="panel">
      <div className="toolbar toolbar--inline toolbar--wrap roster-toolbar">
        <label className="field__label" htmlFor="bulk-status">
          Set all to
        </label>
        <select
          id="bulk-status"
          className="field__input"
          value={bulkStatus}
          onChange={(event) => setBulkStatus(event.target.value as AttendanceStatusValue)}
          disabled={saving || !canSave}
        >
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={applyToAll}
          disabled={saving || !canSave}
        >
          Apply to all
        </button>
        <span className="toolbar__spacer" />
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving || !canSave}
        >
          {saving ? 'Saving…' : 'Save attendance'}
        </button>
      </div>

      <p className="panel__meta">
        {entries.length} students · {editableCount} editable · {date}
      </p>

      {!canSave ? (
        <div className="alert alert--error">
          You can view this roster but do not have permission to record attendance.
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
              <th>Status</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const editable = entry.existingId ? canUpdate : canCreate;
              return (
                <tr key={entry.studentId}>
                  <td>{entry.rollNo || entry.admissionNo || '—'}</td>
                  <td>
                    {entry.name || entry.admissionNo}
                    {entry.existingId ? (
                      <span className="badge roster__recorded">Recorded</span>
                    ) : null}
                  </td>
                  <td>
                    <select
                      className="field__input field__input--compact"
                      aria-label={`Status for ${entry.name || entry.admissionNo}`}
                      value={entry.status}
                      disabled={!editable || saving}
                      onChange={(event) =>
                        setStatus(entry.studentId, event.target.value as AttendanceStatusValue)
                      }
                    >
                      {ATTENDANCE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {humanize(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="field__input field__input--compact"
                      aria-label={`Remark for ${entry.name || entry.admissionNo}`}
                      value={entry.remark}
                      maxLength={255}
                      placeholder="Optional"
                      disabled={!editable || saving}
                      onChange={(event) => setRemark(entry.studentId, event.target.value)}
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
