import { Permission, type TimetableImportResult } from '@smartschool/shared';
import { useState } from 'react';
import { TimetableImportDialog } from '../components/TimetableImportDialog';
import { TimetableDayList, TimetableWeekGrid } from '../components/TimetableViews';
import { ErrorState, PageHeader, Spinner } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useLookups } from '../lib/options';
import { can } from '../lib/permissions';
import { useAsync } from '../lib/useAsync';
import type { TimetableItem } from '../lib/timetable';

const PAGE_SIZE = 100;
const MAX_PAGES = 30;

async function fetchTimetable(sectionId?: string): Promise<TimetableItem[]> {
  const items: TimetableItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items: batch, meta } = await api.list<TimetableItem>('/timetable', {
      page,
      limit: PAGE_SIZE,
      ...(sectionId ? { sectionId } : {}),
    });
    items.push(...batch);
    if (batch.length === 0 || page >= (meta.totalPages || 1)) break;
  }
  return items;
}

export function TimetablePage() {
  const { user } = useAuth();
  const canManage = user ? can(user.role, Permission.TIMETABLE_MANAGE) : false;
  const [sectionId, setSectionId] = useState('');
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { options } = useLookups(['sections']);
  const sectionOptions = options.sections ?? [];
  const state = useAsync<TimetableItem[]>(
    () => fetchTimetable(sectionId || undefined),
    [sectionId],
  );

  const entries = state.data ?? [];

  const onImported = (result: TimetableImportResult) => {
    setImporting(false);
    setNotice(
      `Imported ${result.total} class${result.total === 1 ? '' : 'es'} ${
        result.mode === 'replace' ? '(replaced)' : ''
      }: ${result.created} added, ${result.updated} updated, ${result.removed} removed across ${
        result.sections.length
      } section${result.sections.length === 1 ? '' : 's'}.`,
    );
    state.reload();
  };

  return (
    <div className="page">
      <PageHeader
        title="Timetable"
        subtitle="Weekly class schedule by section"
        actions={
          canManage ? (
            <div className="toolbar toolbar--inline">
              <label className="toolbar__field">
                <span className="muted">Section</span>
                <select
                  className="field__input"
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                >
                  <option value="">All sections</option>
                  {sectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setNotice(null);
                  setImporting(true);
                }}
              >
                Import timetable
              </button>
            </div>
          ) : undefined
        }
      />

      {notice ? (
        <div className="alert alert--success" role="status">
          {notice}
        </div>
      ) : null}

      {state.loading ? (
        <Spinner label="Loading timetable…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <section className="panel">
          {sectionId ? (
            <TimetableWeekGrid entries={entries} />
          ) : (
            <TimetableDayList
              entries={entries}
              showSection
              emptyMessage="No timetable has been published yet. Use “Import timetable” to upload one."
            />
          )}
        </section>
      )}

      {importing ? (
        <TimetableImportDialog onClose={() => setImporting(false)} onImported={onImported} />
      ) : null}
    </div>
  );
}
