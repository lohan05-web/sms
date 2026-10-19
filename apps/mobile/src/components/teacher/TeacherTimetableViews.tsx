import { ScrollView, Text, View } from 'react-native';

import { Chip } from './teacherUi';
import { EmptyState } from '../ui';
import {
  buildWeekGrid,
  dayLabel,
  groupTimetableByDay,
  sectionLabelOf,
  sortTimetableEntries,
  subjectLabel,
  teacherNameOf,
  timeRangeOf,
  type TimetableItem,
} from '../../lib/timetable';
import { colors, radius } from '../../theme';

/**
 * The teacher's timetable renderers.
 *
 * The shared `TimetableDayList` squeezes every field into a 5-across row of
 * 20%-wide cells, which wraps badly on a 375pt phone. These two views give the
 * weekly grid and the daily schedule the breathing room the teacher portal
 * needs, while staying on the same data shape.
 */

/* -------------------------------------------------------------------------- */
/*  Weekly grid                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Time-slot × weekday matrix in a horizontal scroller, mirroring the web
 * `TimetableWeekGrid`. Columns keep a minimum width so a subject name never
 * gets crushed, and rows are separated by a fixed gap so the grid reads as a
 * table rather than a wall of text.
 */
export function TeacherWeekGrid({ entries }: { entries: readonly TimetableItem[] }) {
  if (entries.length === 0) {
    return <EmptyState message="No classes have been scheduled for you yet." icon="timetable" />;
  }
  const grid = buildWeekGrid(entries);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.hScroll}>
      <View>
        {/* Header */}
        <View style={styles.gridHeaderRow}>
          <View style={[styles.gridCorner, styles.gridSlotCell]}>
            <Text style={styles.gridCornerLabel}>Time</Text>
          </View>
          {grid.days.map((day) => (
            <View key={day} style={styles.gridDayCell}>
              <Text style={styles.gridDayLabel} numberOfLines={1}>
                {dayLabel(day)}
              </Text>
            </View>
          ))}
        </View>

        {/* Body */}
        {grid.slots.map((slot) => (
          <View key={slot} style={styles.gridBodyRow}>
            <View style={[styles.gridSlotCell, styles.gridSlotColumn]}>
              <Text style={styles.gridSlotLabel} numberOfLines={1}>
                {slot}
              </Text>
            </View>
            {grid.days.map((day) => {
              const item = grid.cell.get(`${day}|${slot}`);
              return (
                <View key={`${day}|${slot}`} style={styles.gridDayCell}>
                  {item ? (
                    <View style={styles.gridCard}>
                      <Text style={styles.gridCardTitle} numberOfLines={2}>
                        {subjectLabel(item)}
                      </Text>
                      <Text style={styles.gridCardMeta} numberOfLines={1}>
                        {sectionLabelOf(item) || '—'}
                      </Text>
                      {item.room ? (
                        <Text style={styles.gridCardMeta} numberOfLines={1}>
                          {item.room}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.gridBlank} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/*  Day by day                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The same schedule grouped per day, but each period is its own padded card
 * with a time header instead of a wrapped table row.
 */
export function TeacherDayCards({
  entries,
  showSection = true,
  emptyMessage = 'No classes scheduled yet.',
}: {
  entries: readonly TimetableItem[];
  showSection?: boolean;
  emptyMessage?: string;
}) {
  const sorted = sortTimetableEntries(entries);
  if (sorted.length === 0) {
    return <EmptyState message={emptyMessage} icon="timetable" />;
  }
  const groups = groupTimetableByDay(sorted);

  return (
    <View style={styles.days}>
      {groups.map((group) => (
        <View key={group.day} style={styles.day}>
          <View style={styles.dayHead}>
            <Text style={styles.dayTitle}>{dayLabel(group.day)}</Text>
            <Chip label={`${group.items.length} period${group.items.length === 1 ? '' : 's'}`} tone="navy" />
          </View>

          <View style={styles.dayList}>
            {group.items.map((item) => (
              <View key={item.id} style={styles.period}>
                <View style={styles.periodHead}>
                  <View style={styles.periodTime}>
                    <Text style={styles.periodTimeLabel}>{timeRangeOf(item)}</Text>
                  </View>
                  {item.room ? (
                    <Text style={styles.periodRoom} numberOfLines={1}>
                      {item.room}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.periodSubject} numberOfLines={2}>
                  {subjectLabel(item)}
                </Text>

                <View style={styles.periodMeta}>
                  {showSection && sectionLabelOf(item) ? (
                    <Text style={styles.periodMetaItem} numberOfLines={1}>
                      {sectionLabelOf(item)}
                    </Text>
                  ) : null}
                  {teacherNameOf(item) ? (
                    <Text style={styles.periodMetaItem} numberOfLines={1}>
                      {teacherNameOf(item)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

const COL_MIN = 136;

const styles = {
  hScroll: {
    paddingRight: 4,
  },
  gridHeaderRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-end' as const,
  },
  gridBodyRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 8,
  },
  gridCorner: {
    backgroundColor: 'transparent',
  },
  gridCornerLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.textFaint,
  },
  gridSlotCell: {
    width: 62,
    justifyContent: 'center' as const,
  },
  gridSlotColumn: {
    justifyContent: 'flex-start' as const,
    paddingTop: 12,
  },
  gridSlotLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
  },
  gridDayCell: {
    width: COL_MIN,
    minHeight: 64,
  },
  gridDayLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridCard: {
    gap: 3,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    minHeight: 64,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1e3a8a',
  },
  gridCardMeta: {
    fontSize: 11.5,
    color: '#4c1d95',
  },
  gridBlank: {
    minHeight: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed' as const,
  },

  days: {
    gap: 18,
  },
  day: {
    gap: 10,
  },
  dayHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: colors.text,
  },
  dayList: {
    gap: 10,
  },
  period: {
    gap: 6,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  periodHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  periodTime: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.navySurface,
  },
  periodTimeLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#e0e7ff',
  },
  periodRoom: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textMuted,
    flexShrink: 1,
  },
  periodSubject: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 20,
  },
  periodMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  periodMetaItem: {
    fontSize: 12.5,
    color: colors.textMuted,
    flexShrink: 1,
  },
} as const;
