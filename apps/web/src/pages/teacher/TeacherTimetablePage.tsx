import { useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { TimetableDayList, TimetableWeekGrid } from '../../components/TimetableViews';
import { StatCard } from '../../components/ui';
import { TeacherScaffold, useTeacherScope } from './teacherScope';

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export function TeacherTimetablePage() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const entries = scope?.timetableEntries ?? [];

  const days = useMemo(() => new Set(entries.map((entry) => entry.dayOfWeek)).size, [entries]);
  const sections = useMemo(
    () => new Set(entries.map((entry) => entry.section?.id).filter(Boolean)).size,
    [entries],
  );
  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()];
  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.dayOfWeek === todayName),
    [entries, todayName],
  );

  return (
    <TeacherScaffold
      title="Timetable"
      subtitle="Your week at a glance — every class, time slot and room you teach."
      icon="timetable"
      loading={loading}
      error={error}
      forbidden={forbidden}
      reload={reload}
      actions={
        <button type="button" className="btn btn--ghost" onClick={reload}>
          <Icon name="refresh" size={16} />
          Refresh
        </button>
      }
    >
      <section className="stat-grid" aria-label="Timetable summary">
        <StatCard label="Weekly periods" value={entries.length} hint="All sections" icon="timetable" />
        <StatCard label="Teaching days" value={days} hint="Busy days" icon="roster" tone="info" />
        <StatCard label="Sections" value={sections} hint="Timetabled" icon="sections" tone="success" />
        <StatCard
          label="Today's classes"
          value={todayEntries.length}
          hint={new Date().toLocaleDateString(undefined, { weekday: 'long' })}
          icon="attendance"
          tone="warning"
        />
      </section>

      <section className="panel" aria-label="Weekly grid">
        <div className="panel__header">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="roster" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Weekly grid</h2>
              <p className="panel__desc">
                Every teaching period by time slot, laid out across the school week.
              </p>
            </div>
          </div>
          <span className="badge badge--info">
            {entries.length} period{entries.length === 1 ? '' : 's'}
          </span>
        </div>
        <TimetableWeekGrid entries={entries} />
      </section>

      <section className="panel" aria-label="Day by day">
        <div className="panel__header">
          <div className="panel__heading">
            <span className="panel__icon">
              <Icon name="timetable" size={18} />
            </span>
            <div>
              <h2 className="panel__title">Day by day</h2>
              <p className="panel__desc">
                The same schedule grouped into a readable timetable for each day.
              </p>
            </div>
          </div>
          <span className="badge badge--default">
            {days} active day{days === 1 ? '' : 's'}
          </span>
        </div>
        <TimetableDayList
          entries={entries}
          showSection
          emptyMessage="No classes have been scheduled for you yet."
        />
      </section>
    </TeacherScaffold>
  );
}
