import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../../components/ui';
import { humanize } from '../../lib/format';

const STATUS_ORDER = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY'] as const;

/**
 * Mid-tone status colours chosen to stay legible as chart fills on both the
 * light palette and the teacher portal's navy palette.
 */
const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#22c55e',
  ABSENT: '#ef4444',
  LATE: '#f59e0b',
  EXCUSED: '#14b8a6',
  HALF_DAY: '#2dd4bf',
};

/** Shared tooltip styling so recharts popups follow the active palette. */
const TOOLTIP_STYLE = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: 'var(--shadow)',
  fontSize: 12,
  color: 'var(--text)',
} as const;

interface Slice {
  key: string;
  name: string;
  value: number;
  color: string;
}

function toSlices(counts: Record<string, number> | undefined): Slice[] {
  if (!counts) return [];
  return STATUS_ORDER.map((key) => ({
    key,
    name: humanize(key),
    value: Number(counts[key] ?? 0),
    color: STATUS_COLORS[key] ?? '#94a3b8',
  }));
}

/**
 * Donut of attendance-by-status with a compact legend. Falls back to an empty
 * state when the teacher has no attendance marks yet.
 */
export function AttendanceDonut({
  counts,
  emptyMessage = 'No attendance has been recorded for your classes yet.',
}: {
  counts: Record<string, number> | undefined;
  emptyMessage?: string;
}) {
  const slices = toSlices(counts);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = slices.filter((slice) => slice.value > 0);

  if (total === 0) return <EmptyState message={emptyMessage} icon="attendance" />;

  return (
    <div className="attendance-donut">
      <div className="attendance-donut__chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={{ color: 'var(--text)' }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="attendance-donut__total">
          <strong>{total}</strong>
          <span>marks</span>
        </div>
      </div>
      <ul className="attendance-legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className="attendance-legend__swatch" style={{ background: slice.color }} />
            <span className="attendance-legend__label">{slice.name}</span>
            <span className="attendance-legend__value">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar chart of the same status breakdown, useful in narrow panels. */
export function AttendanceBars({ counts }: { counts: Record<string, number> | undefined }) {
  const data = toSlices(counts);
  if (data.every((slice) => slice.value === 0)) {
    return <EmptyState message="No attendance recorded yet." icon="attendance" />;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={{ color: 'var(--text)' }}
          labelStyle={{ color: 'var(--text-muted)' }}
          cursor={{ fill: 'var(--primary-soft)' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Reusable colour chip used by the entity tints on the teacher pages. */
export function StatusDot({ status }: { status: string | null | undefined }) {
  const key = (status ?? '').toUpperCase();
  const color = STATUS_COLORS[key] ?? '#94a3b8';
  return <span className="status-dot" style={{ background: color }} aria-hidden="true" />;
}
