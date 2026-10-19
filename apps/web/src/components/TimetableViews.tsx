import { EmptyState } from './ui';
import {
  buildWeekGrid,
  dayLabel,
  groupTimetableByDay,
  sectionLabelOf,
  subjectLabel,
  teacherNameOf,
  timeRangeOf,
  type TimetableItem,
} from '../lib/timetable';

/** Day-by-day timetable used on the teacher and parent dashboards. */
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
    return (
      <EmptyState
        message={emptyMessage ?? 'No classes scheduled yet.'}
        icon="timetable"
      />
    );
  }
  const groups = groupTimetableByDay(entries);
  return (
    <div className="timetable">
      {groups.map((group) => (
        <div className="timetable__day" key={group.day}>
          <h4 className="timetable__day-title">{dayLabel(group.day)}</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  {showSection ? <th>Class</th> : null}
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id}>
                    <td>{timeRangeOf(item)}</td>
                    {showSection ? <td>{sectionLabelOf(item) || '—'}</td> : null}
                    <td>{subjectLabel(item)}</td>
                    <td>{teacherNameOf(item) ?? '—'}</td>
                    <td>{item.room ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Time-slot × weekday grid for a single section's week. */
export function TimetableWeekGrid({ entries }: { entries: readonly TimetableItem[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        message="No classes are scheduled for this week yet."
        hint="The weekly grid fills in once periods are allocated to your classes."
        icon="timetable"
      />
    );
  }
  const { days, slots, cell } = buildWeekGrid(entries);
  return (
    <div className="table-wrap">
      <table className="table timetable-grid">
        <thead>
          <tr>
            <th scope="col">Time</th>
            {days.map((day) => (
              <th key={day} scope="col">
                {dayLabel(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot}>
              <th scope="row" className="timetable-grid__time">
                {slot}
              </th>
              {days.map((day) => {
                const item = cell.get(`${day}|${slot}`);
                return (
                  <td key={day}>
                    {item ? (
                      <div className="timetable-grid__cell">
                        <strong>{subjectLabel(item)}</strong>
                        <span className="muted">{timeRangeOf(item)}</span>
                        {teacherNameOf(item) ? (
                          <span className="muted">{teacherNameOf(item)}</span>
                        ) : null}
                        {item.room ? <span className="muted">Room {item.room}</span> : null}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
