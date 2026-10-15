import { TimetableDayList } from '../../components/TimetableViews';
import type { TimetableItem } from '../../lib/timetable';
import { ParentChildPage } from './ParentChildPage';

export function ParentTimetablePage() {
  return (
    <ParentChildPage<TimetableItem[]>
      title="Timetable"
      subtitle="Your child's weekly class schedule"
      endpoint={(studentId) => `/parents/me/children/${studentId}/timetable`}
      emptyMessage="No timetable has been published for this class yet."
      isEmpty={(data) => data.length === 0}
      render={(data) => <TimetableDayList entries={data} />}
    />
  );
}
