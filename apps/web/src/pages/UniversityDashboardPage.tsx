import type {
  UniversityActivityItem,
  UniversityDashboard,
  UniversityDesignationCount,
  UniversityPerformancePoint,
} from '@smartschool/shared';
import { Permission, Role } from '@smartschool/shared';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { JoiningPanel } from '../components/JoiningPanel';
import { StudentEnrollmentPanel } from '../components/StudentEnrollmentPanel';
import { CountUp, ErrorState, Spinner } from '../components/ui';
import { api, buildQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, humanize } from '../lib/format';
import { can } from '../lib/permissions';
import {
  areaPath,
  conicGradient,
  designationLegend,
  linePath,
  performanceCeiling,
  performanceCoordinates,
} from '../lib/university';
import { useAsync } from '../lib/useAsync';
import { DashboardSections } from './DashboardPage';
import { ForbiddenPage } from './ForbiddenPage';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;

interface StatTileProps {
  icon: IconName;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'blue' | 'purple' | 'cyan' | 'indigo' | 'green';
}

function StatTile({ icon, label, value, hint, tone = 'blue' }: StatTileProps) {
  return (
    <div className={`udash-tile udash-tile--${tone}`}>
      <span className="udash-tile__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="udash-tile__body">
        <p className="udash-tile__value">
          <CountUp value={value} />
        </p>
        <p className="udash-tile__label">{label}</p>
        {hint ? <p className="udash-tile__hint">{hint}</p> : null}
      </div>
    </div>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  children: ReactNode;
}

function Panel({ title, subtitle, action, span = 6, children }: PanelProps) {
  return (
    <section className={`udash-panel udash-panel--span${span}`}>
      <div className="udash-panel__head">
        <div>
          <h2 className="udash-panel__title">{title}</h2>
          {subtitle ? <p className="udash-panel__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ViewAllLink({ to }: { to: string }) {
  return (
    <Link className="udash-link" to={to}>
      View all
      <Icon name="arrow-right" size={14} />
    </Link>
  );
}

function BarList({
  items,
  formatValue,
}: {
  items: readonly { name: string; count: number }[];
  formatValue?: (value: number) => string;
}) {
  if (items.length === 0) return <p className="udash-empty">No data yet.</p>;
  const peak = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="udash-barlist">
      {items.map((item) => (
        <li key={item.name} className="udash-barlist__row" title={`${item.name}: ${item.count}`}>
          <span className="udash-barlist__label" title={item.name}>
            {item.name}
          </span>
          <span className="udash-barlist__track">
            <span className="udash-barlist__fill" style={{ width: `${(item.count / peak) * 100}%` }} />
          </span>
          <span className="udash-barlist__value">
            {formatValue ? formatValue(item.count) : item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PerformanceChart({ points }: { points: UniversityPerformancePoint[] }) {
  if (points.length === 0) return <p className="udash-empty">No exam results recorded yet.</p>;
  const ceiling = performanceCeiling(points);
  const coordinates = performanceCoordinates(points, CHART_WIDTH, CHART_HEIGHT, ceiling);
  return (
    <div className="udash-chart">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="udash-chart__svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Average marks by month"
      >
        <defs>
          <linearGradient id="udash-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="udash-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5b6bff" />
            <stop offset="100%" stopColor="#a78bfa" />
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
        <path
          d={areaPath(coordinates, CHART_HEIGHT)}
          className="udash-chart__area"
          fill="url(#udash-area)"
        />
        <path d={linePath(coordinates)} className="udash-chart__line" stroke="url(#udash-line)" />
        {coordinates.map((point, index) => (
          <circle
            key={points[index]?.month ?? index}
            className="udash-chart__dot"
            cx={point.x}
            cy={point.y}
            r={5}
          >
            <title>
              {points[index]?.label}: {points[index]?.average}% average marks
            </title>
          </circle>
        ))}
      </svg>
      <div className="udash-chart__labels">
        {points.map((point) => (
          <span key={point.month} className="udash-chart__label">
            {point.label}
            <small>{point.average}%</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ items }: { items: UniversityDesignationCount[] }) {
  const legend = designationLegend(items);
  if (legend.length === 0) return <p className="udash-empty">No teaching staff recorded yet.</p>;
  const total = legend.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="udash-donut">
      <div
        className="udash-donut__ring"
        style={{
          background: conicGradient(
            legend.map((item) => ({ designation: item.key, percentage: item.percentage })),
          ),
        }}
      >
        <div className="udash-donut__hole">
          <span className="udash-donut__total">{total}</span>
          <small>teachers</small>
        </div>
      </div>
      <ul className="udash-donut__legend">
        {legend.map((item) => (
          <li key={item.key} className="udash-donut__legend-row">
            <span className="udash-dot" style={{ background: item.color }} />
            <span className="udash-donut__legend-label">{item.label}</span>
            <span className="udash-donut__legend-value">
              {item.count} · {item.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="udash-table-wrap">
      <table className="udash-table">
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ActivityList({ items }: { items: UniversityActivityItem[] }) {
  if (items.length === 0) return <p className="udash-empty">No recent activity.</p>;
  return (
    <ul className="udash-activity">
      {items.map((item) => (
        <li key={item.id} className="udash-activity__item">
          <span className="udash-activity__dot" />
          <div>
            <p className="udash-activity__title">
              {humanize(item.action)} · {humanize(item.entity)}
            </p>
            <p className="udash-activity__meta">
              {item.actor ?? 'System'} · {formatDateTime(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: IconName;
  permission?: Permission;
  roles?: readonly Role[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Add Student',
    description: 'Enroll a new learner',
    to: '/resource/students',
    icon: 'students',
    permission: Permission.STUDENT_CREATE,
  },
  {
    label: 'Add Teacher',
    description: 'Onboard teaching staff',
    to: '/resource/teachers',
    icon: 'teacher',
    permission: Permission.TEACHER_MANAGE,
  },
  {
    label: 'Create Exam',
    description: 'Schedule an assessment',
    to: '/resource/exams',
    icon: 'subject',
    permission: Permission.EXAM_MANAGE,
  },
  {
    label: 'Enter Marks',
    description: 'Record exam results',
    to: '/exams/marks',
    icon: 'marks',
    permission: Permission.RESULT_MANAGE,
  },
  {
    label: 'View Reports',
    description: 'Analytics and report cards',
    to: '/reports',
    icon: 'reports',
    permission: Permission.REPORT_READ,
  },
];

function QuickActions({ role }: { role: Role }) {
  const actions = QUICK_ACTIONS.filter((action) => {
    if (action.roles && !action.roles.includes(role)) return false;
    return !action.permission || can(role, action.permission);
  });
  if (actions.length === 0) return null;
  return (
    <Panel title="Quick actions" subtitle="Jump straight into common tasks" span={12}>
      <div className="udash-quick">
        {actions.map((action) => (
          <Link key={action.to} className="udash-quick__card" to={action.to}>
            <span className="udash-quick__icon">
              <Icon name={action.icon} size={18} />
            </span>
            <span className="udash-quick__body">
              <span className="udash-quick__label">{action.label}</span>
              <span className="udash-quick__desc">{action.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="udash-mini">
      <span className="udash-mini__value">
        <CountUp value={value} />
      </span>
      <span className="udash-mini__label">{label}</span>
    </div>
  );
}

export function UniversityDashboardPage() {
  const { user } = useAuth();
  const [academicYearId, setAcademicYearId] = useState('');
  const state = useAsync<UniversityDashboard>(
    () => api.get<UniversityDashboard>(`/reports/university${buildQuery({ academicYearId })}`),
    [academicYearId],
  );

  if (state.forbidden) return <ForbiddenPage />;

  const data = state.data;

  return (
    <div className="page udash">
      <header className="udash-hero">
        <div className="udash-hero__text">
          <p className="udash-hero__eyebrow">{data?.academicYear?.name ?? 'Campus overview'}</p>
          <h1 className="udash-hero__title">University Dashboard</h1>
          <p className="udash-hero__subtitle">
            Students, staff, exams and performance in real time.
          </p>
        </div>
        <div className="udash-hero__controls">
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
                {year.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="udash-btn"
            onClick={state.reload}
            disabled={state.loading}
          >
            <Icon name="refresh" size={16} />
            Refresh
          </button>
        </div>
      </header>

      {state.loading && !data ? (
        <Spinner label="Loading university dashboard…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data ? (
        <div className="udash-grid">
          <section className="udash-tiles" aria-label="Key metrics">
            <StatTile icon="students" label="Students" value={data.overview.students} tone="blue" />
            <StatTile icon="teacher" label="Teachers" value={data.overview.teachers} tone="purple" />
            <StatTile icon="subject" label="Subjects" value={data.overview.courses} tone="cyan" />
            <StatTile icon="marks" label="Exams" value={data.overview.exams} tone="indigo" />
            <StatTile
              icon="trending"
              label="Average marks"
              value={`${data.overview.averageMarks}%`}
              tone="green"
            />
          </section>

          {user ? <QuickActions role={user.role} /> : null}

          <JoiningPanel />

          {data.students ? (
            <>
              <StudentEnrollmentPanel students={data.students} />

              <Panel
                title="Recent admissions"
                subtitle="Latest students on record"
                action={
                  user && can(user.role, Permission.STUDENT_READ) ? (
                    <ViewAllLink to="/resource/students" />
                  ) : undefined
                }
                span={5}
              >
                <DataTable head={['Student', 'Admission No', 'Class', 'Status', 'Joined']}>
                  {data.students.recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="udash-empty">
                        No students yet.
                      </td>
                    </tr>
                  ) : (
                    data.students.recent.map((student) => (
                      <tr key={student.id}>
                        <td>{student.name ?? '—'}</td>
                        <td>{student.admissionNo}</td>
                        <td>{student.className ?? '—'}</td>
                        <td>
                          <span className="udash-badge">{humanize(student.status)}</span>
                        </td>
                        <td>{formatDate(student.admissionDate)}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.teachers ? (
            <>
              <Panel title="Teaching staff" subtitle="Employment and workload" span={5}>
                <div className="udash-mini-row">
                  <MiniStat label="Total" value={data.teachers.total} />
                  <MiniStat label="Active" value={data.teachers.active} />
                  <MiniStat label="Full time" value={data.teachers.fullTime} />
                  <MiniStat label="Part time" value={data.teachers.partTime} />
                </div>
                <h3 className="udash-subtitle">By employment type</h3>
                <BarList
                  items={data.teachers.byEmploymentType.map((item) => ({
                    name: item.label,
                    count: item.count,
                  }))}
                />
                <h3 className="udash-subtitle">Workload</h3>
                <p className="udash-note">
                  {data.teachers.workload.assignments} assignments ·{' '}
                  {data.teachers.workload.average} average per teacher
                </p>
              </Panel>

              <Panel
                title="Recent teachers"
                subtitle="Newest teaching staff"
                action={
                  user && can(user.role, Permission.TEACHER_READ) ? (
                    <ViewAllLink to="/resource/teachers" />
                  ) : undefined
                }
                span={7}
              >
                <DataTable head={['Teacher', 'Employee No', 'Designation', 'Subjects', 'Workload']}>
                  {data.teachers.recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="udash-empty">
                        No teachers yet.
                      </td>
                    </tr>
                  ) : (
                    data.teachers.recent.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>{teacher.name ?? '—'}</td>
                        <td>{teacher.employeeNo}</td>
                        <td>
                          <span className="udash-badge">{teacher.designationLabel}</span>
                        </td>
                        <td>{teacher.subjects}</td>
                        <td>{teacher.workload}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.exams ? (
            <>
              <Panel
                title="Performance trend"
                subtitle="Average marks scored over recent exams"
                span={12}
              >
                <div className="udash-mini-row">
                  <MiniStat label="Average marks" value={`${data.exams.averageMarks}%`} />
                  <MiniStat label="Pass rate" value={`${data.exams.passRate}%`} />
                  <MiniStat label="Exams" value={data.exams.total} />
                  <MiniStat label="Results" value={data.exams.results} />
                </div>
                <PerformanceChart points={data.exams.performance} />
              </Panel>

              <Panel title="Recent exams" subtitle="Scheduled and completed" span={6}>
                <DataTable head={['Exam', 'Class', 'Date', 'Results']}>
                  {data.exams.recent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="udash-empty">
                        No exams yet.
                      </td>
                    </tr>
                  ) : (
                    data.exams.recent.map((exam) => (
                      <tr key={exam.id}>
                        <td>{exam.name}</td>
                        <td>{exam.className ?? '—'}</td>
                        <td>{formatDate(exam.startDate)}</td>
                        <td>{exam.results}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>

              <Panel title="Recent results" subtitle="Latest marks recorded" span={6}>
                <DataTable head={['Student', 'Subject', 'Marks', '%', 'Grade']}>
                  {data.exams.recentResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="udash-empty">
                        No results yet.
                      </td>
                    </tr>
                  ) : (
                    data.exams.recentResults.map((result) => (
                      <tr key={result.id}>
                        <td>{result.studentName ?? result.admissionNo ?? '—'}</td>
                        <td>{result.subject}</td>
                        <td>
                          {result.marksObtained}/{result.maxMarks}
                        </td>
                        <td>
                          <span className="udash-badge">{result.percentage}%</span>
                        </td>
                        <td>{result.grade ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.roleAnalytics ? (
            <Panel title="Role analytics" subtitle="Teaching staff by designation" span={5}>
              <DonutChart items={data.roleAnalytics.byDesignation} />
            </Panel>
          ) : null}

          {data.activity ? (
            <Panel
              title="Recent activity"
              subtitle="Latest actions across the campus"
              span={data.roleAnalytics ? 7 : 12}
            >
              <ActivityList items={data.activity} />
            </Panel>
          ) : null}

          <section className="udash-ops">
            <div className="udash-ops__head">
              <h2 className="udash-ops__title">Operations</h2>
              <p className="udash-ops__subtitle">
                Finance, attendance, admissions and joining trends.
              </p>
            </div>
            <DashboardSections showQuickActions={false} showJoining={false} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
