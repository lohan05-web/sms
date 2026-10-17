import {
  attendanceIndicatorLabel,
  monthInputValue,
  monthRange,
  type AttendanceIndicator,
} from '@smartschool/shared';
import type { Option } from './options';

export type IndicatorTone = 'success' | 'warning' | 'danger';

/** Map an attendance indicator band to a badge/CSS tone. */
export function indicatorTone(indicator: AttendanceIndicator): IndicatorTone {
  switch (indicator) {
    case 'good':
      return 'success';
    case 'warning':
      return 'warning';
    default:
      return 'danger';
  }
}

export function indicatorLabel(indicator: AttendanceIndicator): string {
  return attendanceIndicatorLabel(indicator);
}

/** The most recent `count` months as `YYYY-MM` options, newest first. */
export function monthOptions(count: number, today: Date): Option[] {
  const options: Option[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - index, 1));
    const value = monthInputValue(date);
    const range = monthRange(value);
    options.push({ value, label: range?.label ?? value });
  }
  return options;
}

export interface TrackerFilters {
  classLevelId?: string;
  sectionId?: string;
  studentId?: string;
  month?: string;
  termId?: string;
}

/** True when enough scope is selected to query the tracker. */
export function hasScope(filters: TrackerFilters): boolean {
  return Boolean(filters.classLevelId || filters.sectionId || filters.studentId);
}

/** Build the querystring for `GET /attendances/summary`, dropping empties. */
export function trackerQueryString(filters: TrackerFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
