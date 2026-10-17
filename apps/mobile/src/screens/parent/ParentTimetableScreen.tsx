import { TimetableDayList } from '../../components/TimetableViews';
import { ParentChildShell } from '../../components/ParentChildShell';
import type { TimetableItem } from '../../lib/timetable';

export function ParentTimetableScreen() {
  return (
    <ParentChildShell<TimetableItem[]>
      title="Timetable"
      subtitle="Your child's weekly class schedule"
      endpoint={(studentId) => `/parents/me/children/${studentId}/timetable`}
      emptyMessage="No timetable has been published for this class yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => (
        <TimetableDayList
          entries={data}
          emptyMessage="No timetable has been published for this class yet."
        />
      )}
    />
  );
}
