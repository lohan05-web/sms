import { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { FilterChips } from '../../components/DataList';
import { TeacherDayCards, TeacherWeekGrid } from '../../components/teacher/TeacherTimetableViews';
import {
  TeacherButton,
  TeacherEmpty,
  TeacherPage,
  TeacherPanel,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { dayLabel, WEEK_DAYS } from '../../lib/timetable';
import { useTeacherScope } from '../../lib/teacherScope';
import { colors, radius } from '../../theme';

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/**
 * Port of the web `/teacher/timetable`: the summary strip, the weekly grid and
 * the day-by-day schedule. Both views get a generous row gap so a full week
 * stays readable on a phone.
 */
export function TeacherTimetableScreen() {
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const entries = scope?.timetableEntries ?? [];

  const [dayFilter, setDayFilter] = useState<string>('all');

  const days = useMemo(() => new Set(entries.map((entry) => entry.dayOfWeek)).size, [entries]);
  const sections = useMemo(
    () => new Set(entries.map((entry) => entry.section?.id).filter(Boolean)).size,
    [entries],
  );
  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()] ?? 'MONDAY';
  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.dayOfWeek === todayName),
    [entries, todayName],
  );

  const dayOptions = useMemo(() => {
    const present = new Set(entries.map((entry) => entry.dayOfWeek));
    return [
      { value: 'all', label: 'All days' },
      ...WEEK_DAYS.filter((day) => present.has(day)).map((day) => ({
        value: day,
        label: dayLabel(day),
      })),
    ];
  }, [entries]);

  const dayEntries = useMemo(
    () => (dayFilter === 'all' ? entries : entries.filter((entry) => entry.dayOfWeek === dayFilter)),
    [entries, dayFilter],
  );

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading) return <SkeletonPanels count={4} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="Weekly periods" value={entries.length} hint="All sections" icon="timetable" />
        <StatCard label="Teaching days" value={days} hint="Active days" icon="roster" tone="info" />
        <StatCard label="Sections" value={sections} hint="Timetabled" icon="sections" tone="success" />
        <StatCard
          label="Today's classes"
          value={todayEntries.length}
          hint={new Date().toLocaleDateString(undefined, { weekday: 'long' })}
          icon="attendance"
          tone="warning"
        />
      </StatGrid>

      <TeacherPanel
        title="Weekly timetable"
        subtitle="Every teaching period by time slot, laid out across the school week"
        icon="roster"
        accent="navy"
        action={
          <Pressable
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel="Refresh timetable"
            style={({ pressed }) => [styles.refresh, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.refreshLabel}>Refresh</Text>
          </Pressable>
        }
      >
        {entries.length === 0 ? (
          <TeacherEmpty
            message="No classes have been scheduled for you yet."
            hint="Your weekly teaching timetable appears here once an administrator builds it."
            icon="timetable"
          />
        ) : (
          <TeacherWeekGrid entries={entries} />
        )}
      </TeacherPanel>

      <TeacherPanel
        title="Daily schedule"
        subtitle="The same classes grouped into a readable timetable for each day"
        icon="calendar-check"
        accent="violet"
        action={
          <Text style={styles.badge}>
            {dayEntries.length} period{dayEntries.length === 1 ? '' : 's'}
          </Text>
        }
      >
        {dayOptions.length > 1 ? (
          <FilterChips options={dayOptions} value={dayFilter} onChange={setDayFilter} />
        ) : null}
        <TeacherDayCards
          entries={dayEntries}
          showSection
          emptyMessage="No classes scheduled for this day."
        />
      </TeacherPanel>

      {todayEntries.length > 0 && dayFilter !== todayName ? (
        <TeacherButton
          label={`Show today's schedule (${dayLabel(todayName)})`}
          icon="calendar-check"
          variant="ghost"
          onPress={() => setDayFilter(todayName)}
        />
      ) : null}
    </TeacherPage>
  );
}

const styles = {
  refresh: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  refreshLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.info,
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden' as const,
  },
} as const;
