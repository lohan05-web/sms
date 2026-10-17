import { ScrollView, Text, View } from 'react-native';
import {
  dayLabel,
  groupTimetableByDay,
  sectionLabelOf,
  subjectLabel,
  teacherNameOf,
  timeRangeOf,
  type TimetableItem,
} from '../lib/timetable';

/**
 * Day-by-day timetable used on the teacher and parent portals.
 * Rendered as a scrollable list instead of a table.
 */
export function TimetableDayList({
  entries,
  showSection = false,
  emptyMessage,
}: {
  entries: readonly TimetableItem[];
  showSection?: boolean;
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return <Text style={styles.muted}>{emptyMessage ?? 'No classes scheduled yet.'}</Text>;
  }
  const groups = groupTimetableByDay(entries);
  return (
    <View>
      {groups.map((group) => (
        <View key={group.day} style={styles.day}>
          <Text style={styles.dayTitle}>{dayLabel(group.day)}</Text>
          <ScrollView>
            {group.items.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.cell}>{timeRangeOf(item)}</Text>
                {showSection ? (
                  <Text style={styles.cell}>{sectionLabelOf(item) || '—'}</Text>
                ) : null}
                <Text style={styles.cell}>{subjectLabel(item)}</Text>
                <Text style={styles.cell}>{teacherNameOf(item) ?? '—'}</Text>
                <Text style={styles.cell}>{item.room ?? '—'}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = {
  day: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  cell: {
    flexGrow: 1,
    flexBasis: '20%',
    fontSize: 13,
    color: '#334155',
    paddingVertical: 2,
  },
  muted: {
    color: '#64748b',
    fontSize: 14,
    margin: 8,
  },
} as const;
