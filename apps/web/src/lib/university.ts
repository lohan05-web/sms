import type {
  UniversityDesignationCount,
  UniversityPerformancePoint,
} from '@smartschool/shared';

const DESIGNATION_COLORS: Record<string, string> = {
  PROFESSOR: '#8b5cf6',
  ASSOCIATE_PROFESSOR: '#7c8cff',
  ASSISTANT_PROFESSOR: '#38bdf8',
  LECTURER: '#22d3ee',
  OTHER: '#a78bfa',
};

export function designationColor(designation: string): string {
  return DESIGNATION_COLORS[designation] ?? '#818cf8';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Builds a CSS `conic-gradient` string from designation shares (one slice per designation). */
export function conicGradient(
  items: readonly { designation: string; percentage: number }[],
): string {
  const stops: string[] = [];
  let cursor = 0;
  for (const item of items) {
    if (item.percentage <= 0) continue;
    const start = cursor;
    cursor = Math.min(100, start + item.percentage);
    stops.push(`${designationColor(item.designation)} ${round(start)}% ${round(cursor)}%`);
  }
  if (cursor < 100) {
    stops.push(`rgba(148, 163, 255, 0.14) ${round(cursor)}% 100%`);
  }
  return `conic-gradient(from 180deg, ${stops.join(', ')})`;
}

/** Rounds the peak average up to the next multiple of 10, clamped to (0, 100]. */
export function performanceCeiling(points: readonly { average: number }[]): number {
  const values = points.map((point) => point.average);
  const max = values.length > 0 ? Math.max(...values) : 0;
  return Math.min(100, Math.max(10, Math.ceil(max / 10) * 10));
}

/** Rounds the largest value up to a clean axis maximum (1, 2, 5, 10, …). */
export function niceCeiling(values: readonly number[]): number {
  const max = values.length > 0 ? Math.max(...values) : 0;
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export interface ChartPoint {
  x: number;
  y: number;
}

/** Maps a numeric series to SVG coordinates inside a `width` x `height` box. */
export function seriesCoordinates(
  values: readonly number[],
  width: number,
  height: number,
  ceiling: number,
): ChartPoint[] {
  const safeCeiling = ceiling > 0 ? ceiling : 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) => {
    const x = values.length > 1 ? index * step : width / 2;
    const ratio = Math.min(1, Math.max(0, value / safeCeiling));
    return { x: round(x), y: round(height - ratio * height) };
  });
}

/** Maps performance points to SVG coordinates inside a `width` x `height` box. */
export function performanceCoordinates(
  points: readonly UniversityPerformancePoint[],
  width: number,
  height: number,
  ceiling = 100,
): ChartPoint[] {
  const safeCeiling = ceiling > 0 ? ceiling : 100;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  return points.map((point, index) => {
    const x = points.length > 1 ? index * step : width / 2;
    const ratio = Math.min(1, Math.max(0, point.average / safeCeiling));
    return { x: round(x), y: round(height - ratio * height) };
  });
}

export function linePath(points: readonly ChartPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

export function areaPath(points: readonly ChartPoint[], height: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '';
  return `${linePath(points)} L${last.x} ${height} L${first.x} ${height} Z`;
}

export function sharePercentage(count: number, total: number): number {
  return total > 0 ? round((count / total) * 100) : 0;
}

export interface DesignationLegendItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

/** Sorts designation counts by size and resolves a colour for each. */
export function designationLegend(
  items: readonly UniversityDesignationCount[],
): DesignationLegendItem[] {
  return [...items]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      key: item.designation,
      label: item.label,
      count: item.count,
      percentage: item.percentage,
      color: designationColor(item.designation),
    }));
}
