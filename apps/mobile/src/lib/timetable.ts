import { weekOrder } from './activities';

/** Timetable entry as returned by the admin, teacher and parent APIs. */
export interface TimetableItem {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  materials?: string | null;
  subject?: { id?: string; name?: string; code?: string | null } | null;
  teacher?:
    | { id?: string; name?: string; user?: { firstName?: string; lastName?: string } | null }
    | null;
  section?: { id?: string; name?: string; classLevel?: { name?: string } | null } | null;
}

export const WEEK_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export function dayLabel(day: string): string {
  const lower = day.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

export function subjectLabel(item: TimetableItem): string {
  return item.subject?.name ?? '—';
}

/** Teacher name works for both API shapes: { name } and { user: { firstName } }. */
export function teacherNameOf(item: TimetableItem): string | null {
  if (item.teacher?.name) return item.teacher.name;
  const first = item.teacher?.user?.firstName ?? '';
  const last = item.teacher?.user?.lastName ?? '';
  return `${first} ${last}`.trim() || null;
}

export function sectionLabelOf(item: TimetableItem): string {
  const className = item.section?.classLevel?.name;
  const sectionName = item.section?.name;
  return [className, sectionName].filter(Boolean).join(' · ');
}

export function timeRangeOf(item: TimetableItem): string {
  return `${item.startTime}–${item.endTime}`;
}

export function sortTimetableEntries(items: readonly TimetableItem[]): TimetableItem[] {
  return [...items].sort((a, b) => {
    const byDay = weekOrder(a.dayOfWeek) - weekOrder(b.dayOfWeek);
    if (byDay !== 0) return byDay;
    if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
    return sectionLabelOf(a).localeCompare(sectionLabelOf(b));
  });
}

export interface TimetableDayGroup {
  day: string;
  items: TimetableItem[];
}

export function groupTimetableByDay(items: readonly TimetableItem[]): TimetableDayGroup[] {
  const sorted = sortTimetableEntries(items);
  const days: string[] = [];
  for (const item of sorted) {
    if (!days.includes(item.dayOfWeek)) days.push(item.dayOfWeek);
  }
  return days.map((day) => ({ day, items: sorted.filter((item) => item.dayOfWeek === day) }));
}

export interface WeekGrid {
  days: string[];
  slots: string[];
  cell: Map<string, TimetableItem>;
}

/** Build the time-slot × weekday matrix used to render a single section's week. */
export function buildWeekGrid(items: readonly TimetableItem[]): WeekGrid {
  const sorted = sortTimetableEntries(items);
  const days: string[] = [];
  const slots: string[] = [];
  const cell = new Map<string, TimetableItem>();
  for (const item of sorted) {
    if (!days.includes(item.dayOfWeek)) days.push(item.dayOfWeek);
    if (!slots.includes(item.startTime)) slots.push(item.startTime);
    cell.set(`${item.dayOfWeek}|${item.startTime}`, item);
  }
  slots.sort();
  return { days, slots, cell };
}
