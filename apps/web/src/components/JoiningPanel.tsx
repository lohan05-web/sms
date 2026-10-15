import type { JoiningMonthPoint, JoiningReport, JoiningYearPoint } from '@smartschool/shared';
import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { ErrorState, Spinner } from './ui';
import { api, buildQuery } from '../lib/api';
import { monthOptions } from '../lib/attendanceTracker';
import { areaPath, linePath, niceCeiling, seriesCoordinates } from '../lib/university';
import { useAsync } from '../lib/useAsync';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const STUDENT_COLOR = '#8b5cf6';
const TEACHER_COLOR = '#22d3ee';

function DualAreaChart({ points }: { points: JoiningMonthPoint[] }) {
  if (points.length === 0) return <p className="udash-empty">No joining data yet.</p>;

  const ceiling = niceCeiling(points.flatMap((point) => [point.students, point.teachers]));
  const students = seriesCoordinates(points.map((point) => point.students), CHART_WIDTH, CHART_HEIGHT, ceiling);
  const teachers = seriesCoordinates(points.map((point) => point.teachers), CHART_WIDTH, CHART_HEIGHT, ceiling);

  return (
    <div className="udash-joining__chart">
      <div className="udash-joining__legend">
        <span className="udash-joining__legend-item">
          <span className="udash-dot" style={{ background: STUDENT_COLOR }} />
          Students
        </span>
        <span className="udash-joining__legend-item">
          <span className="udash-dot" style={{ background: TEACHER_COLOR }} />
          Teachers
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="udash-chart__svg udash-joining__svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Monthly student and teacher joinings"
      >
        <defs>
          <linearGradient id="join-students" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STUDENT_COLOR} stopOpacity="0.42" />
            <stop offset="100%" stopColor={STUDENT_COLOR} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="join-teachers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TEACHER_COLOR} stopOpacity="0.32" />
            <stop offset="100%" stopColor={TEACHER_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            className="udash-chart__grid"
            x1={0}
            x2={CHART_WIDTH}
            y1={ratio * CHART_HEIGHT}
            y2={ratio * CHART_HEIGHT}
          />
        ))}
        <path d={areaPath(students, CHART_HEIGHT)} fill="url(#join-students)" />
        <path d={areaPath(teachers, CHART_HEIGHT)} fill="url(#join-teachers)" />
        <path d={linePath(students)} className="udash-chart__line" stroke={STUDENT_COLOR} />
        <path d={linePath(teachers)} className="udash-chart__line" stroke={TEACHER_COLOR} />
        {students.map((point, index) => (
          <circle
            key={`s-${points[index]?.month ?? index}`}
            className="udash-chart__dot"
            style={{ stroke: STUDENT_COLOR }}
            cx={point.x}
            cy={point.y}
            r={4}
          />
        ))}
        {teachers.map((point, index) => (
          <circle
            key={`t-${points[index]?.month ?? index}`}
            className="udash-chart__dot"
            style={{ stroke: TEACHER_COLOR }}
            cx={point.x}
            cy={point.y}
            r={4}
          />
        ))}
      </svg>
      <div className="udash-chart__labels">
        {points.map((point) => (
          <span key={point.month} className="udash-chart__label">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface GrowthPillProps {
  label: string;
  current: number;
  delta: number;
  percent: number | null;
  previousLabel: string;
  tone: 'students' | 'teachers';
}

function GrowthPill({ label, current, delta, percent, previousLabel, tone }: GrowthPillProps) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const change = percent === null ? '—' : `${percent > 0 ? '+' : ''}${percent}%`;
  return (
    <div className={`udash-joining__pill udash-joining__pill--${tone}`}>
      <span className="udash-joining__pill-label">{label}</span>
      <span className="udash-joining__pill-value">{current}</span>
      <span className={`udash-joining__pill-delta udash-joining__pill-delta--${direction}`}>
        {delta > 0 ? '+' : ''}
        {delta} · {change} vs {previousLabel}
      </span>
    </div>
  );
}

function YearComparison({ years }: { years: JoiningYearPoint[] }) {
  if (years.length === 0) return <p className="udash-empty">No academic years configured yet.</p>;
  const peak = Math.max(1, ...years.flatMap((year) => [year.students, year.teachers]));
  return (
    <ul className="udash-joining__years">
      {years.map((year) => (
        <li key={year.id} className="udash-joining__year">
          <span className="udash-joining__year-name">
            {year.name}
            {year.isCurrent ? <span className="udash-joining__current">Current</span> : null}
          </span>
          <span className="udash-joining__year-bars">
            <span className="udash-joining__year-track">
              <span
                className="udash-joining__year-fill udash-joining__year-fill--students"
                style={{ width: `${(year.students / peak) * 100}%` }}
              />
            </span>
            <span className="udash-joining__year-track">
              <span
                className="udash-joining__year-fill udash-joining__year-fill--teachers"
                style={{ width: `${(year.teachers / peak) * 100}%` }}
              />
            </span>
          </span>
          <span className="udash-joining__year-counts">
            <span>{year.students} students</span>
            <span>{year.teachers} teachers</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A unique, server-backed "Joining statistics" panel for the university
 * dashboard: dual-series area chart, growth vs the previous month and a
 * year-on-year comparison. Kept separate from the legacy school dashboard.
 */
export function JoiningPanel() {
  const months = useMemo(() => monthOptions(18, new Date()), []);
  const [academicYearId, setAcademicYearId] = useState('');
  const [month, setMonth] = useState('');

  const state = useAsync<JoiningReport>(
    () => api.get<JoiningReport>(`/reports/joinings${buildQuery({ academicYearId, month })}`),
    [academicYearId, month],
  );
  const data = state.data;

  return (
    <section className="udash-joining">
      <header className="udash-joining__head">
        <div className="udash-joining__intro">
          <p className="udash-joining__eyebrow">
            <Icon name="trending" size={14} />
            Growth
          </p>
          <h2 className="udash-joining__title">Joining statistics</h2>
          <p className="udash-joining__subtitle">
            {data?.academicYear?.name ?? 'Current academic year'} ·{' '}
            {data?.selectedMonth.label ?? 'Current month'}
          </p>
        </div>
        <div className="udash-joining__filters">
          <select
            className="udash-select"
            aria-label="Academic year"
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
          >
            <option value="">Current academic year</option>
            {(data?.academicYears ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select
            className="udash-select"
            aria-label="Month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="">Current month</option>
            {months.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {state.loading && !data ? (
        <Spinner label="Loading joining statistics…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data ? (
        <div className="udash-joining__grid">
          <div className="udash-joining__chart-col">
            <DualAreaChart points={data.monthly} />
          </div>

          <div className="udash-joining__side">
            <GrowthPill
              label="Students joined · month"
              current={data.growth.current.students}
              delta={data.growth.studentDelta}
              percent={data.growth.studentPercent}
              previousLabel={data.growth.previousLabel}
              tone="students"
            />
            <GrowthPill
              label="Teachers joined · month"
              current={data.growth.current.teachers}
              delta={data.growth.teacherDelta}
              percent={data.growth.teacherPercent}
              previousLabel={data.growth.previousLabel}
              tone="teachers"
            />
            <div className="udash-joining__totals">
              <div className="udash-joining__total">
                <span className="udash-joining__total-value">{data.totals.academicYear.students}</span>
                <span className="udash-joining__total-label">Students · year</span>
              </div>
              <div className="udash-joining__total">
                <span className="udash-joining__total-value">{data.totals.academicYear.teachers}</span>
                <span className="udash-joining__total-label">Teachers · year</span>
              </div>
              <div className="udash-joining__total">
                <span className="udash-joining__total-value">{data.totals.month.students}</span>
                <span className="udash-joining__total-label">Students · month</span>
              </div>
              <div className="udash-joining__total">
                <span className="udash-joining__total-value">{data.totals.month.teachers}</span>
                <span className="udash-joining__total-label">Teachers · month</span>
              </div>
            </div>
          </div>

          <div className="udash-joining__compare">
            <h3 className="udash-subtitle">Academic year comparison</h3>
            <YearComparison years={data.academicYears} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
