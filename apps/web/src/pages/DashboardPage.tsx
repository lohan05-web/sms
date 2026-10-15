import type { JoiningMonthPoint, JoiningReport, JoiningYearPoint } from '@smartschool/shared';
import { Permission, Role } from '@smartschool/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader, StatCard, Spinner, ErrorState, formatStatValue } from '../components/ui';
import { api, buildQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { monthOptions } from '../lib/attendanceTracker';
import { useAsync } from '../lib/useAsync';
import { formatCurrency } from '../lib/format';
import { can } from '../lib/permissions';
import { useSettings } from '../lib/settings';
import { ForbiddenPage } from './ForbiddenPage';

interface AttendanceCard {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: string;
}

interface DashboardData {
  counts: Record<string, number>;
  pipeline: {
    openAdmissions: number;
    pendingRequests: number;
  };
  finance: {
    invoices: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectedThisMonth: number;
    byStatus: Record<string, number>;
  };
  attendanceToday: AttendanceCard;
  attendanceOverall: AttendanceCard;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function AttendancePanel({ title, card }: { title: string; card: AttendanceCard }) {
  return (
    <section className="panel">
      <h2 className="panel__title">{title}</h2>
      <div className="stat-grid">
        <StatCard label="Total marks" value={formatStatValue(card.total)} />
        <StatCard
          label="Attendance rate"
          value={`${card.percentage}%`}
          hint={titleCase(card.indicator)}
        />
        {Object.entries(card.byStatus).map(([key, value]) => (
          <StatCard key={key} label={titleCase(key)} value={formatStatValue(value)} />
        ))}
      </div>
    </section>
  );
}

/** Grouped horizontal bar chart of monthly student/teacher joinings. */
function JoiningChart({ points }: { points: JoiningMonthPoint[] }) {
  const max = useMemo(
    () => Math.max(1, ...points.flatMap((point) => [point.students, point.teachers])),
    [points],
  );

  return (
    <div className="bar-chart">
      <div className="bar-legend">
        <span className="bar-legend__item">
          <span className="bar-legend__swatch bar-legend__swatch--students" /> Students
        </span>
        <span className="bar-legend__item">
          <span className="bar-legend__swatch bar-legend__swatch--teachers" /> Teachers
        </span>
      </div>
      {points.map((point) => (
        <div className="bar-row" key={point.month}>
          <span className="bar-row__label">{point.label}</span>
          <div className="bar-row__bars">
            <div className="bar">
              <div className="bar__track">
                <div
                  className="bar__fill bar__fill--students"
                  style={{ width: `${(point.students / max) * 100}%` }}
                />
              </div>
              <span className="bar__value">{point.students}</span>
            </div>
            <div className="bar">
              <div className="bar__track">
                <div
                  className="bar__fill bar__fill--teachers"
                  style={{ width: `${(point.teachers / max) * 100}%` }}
                />
              </div>
              <span className="bar__value">{point.teachers}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function YearComparisonTable({ years }: { years: JoiningYearPoint[] }) {
  if (years.length === 0) return <p className="muted">No academic years configured yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Academic year</th>
            <th>Students joined</th>
            <th>Teachers joined</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year.id}>
              <td>
                {year.name}
                {year.isCurrent ? <span className="badge badge--success"> Current</span> : null}
              </td>
              <td>{year.students}</td>
              <td>{year.teachers}</td>
              <td>{year.students + year.teachers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function growthHint(delta: number, percent: number | null, previousLabel: string): string {
  const sign = delta > 0 ? '+' : '';
  const change = percent === null ? '—' : `${percent > 0 ? '+' : ''}${percent}%`;
  return `${sign}${delta} vs ${previousLabel} · ${change}`;
}

function JoiningSection() {
  const months = monthOptions(18, new Date());
  const [academicYearId, setAcademicYearId] = useState('');
  const [month, setMonth] = useState('');

  const state = useAsync<JoiningReport>(
    () => api.get<JoiningReport>(`/reports/joinings${buildQuery({ academicYearId, month })}`),
    [academicYearId, month],
  );

  const data = state.data;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2 className="panel__title">Joining statistics</h2>
        <button type="button" className="btn btn--ghost" onClick={state.reload}>
          Refresh
        </button>
      </div>

      <form className="toolbar toolbar--wrap" onSubmit={(event) => event.preventDefault()}>
        <select
          className="field__input"
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
          className="field__input"
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
      </form>

      {state.loading ? (
        <Spinner label="Loading joining statistics…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Students joined (year)"
              value={data.totals.academicYear.students}
              hint={data.academicYear?.name ?? 'No academic year'}
            />
            <StatCard
              label="Teachers joined (year)"
              value={data.totals.academicYear.teachers}
              hint={data.academicYear?.name ?? 'No academic year'}
            />
            <StatCard
              label="Students joined (month)"
              value={data.totals.month.students}
              hint={data.selectedMonth.label}
            />
            <StatCard
              label="Teachers joined (month)"
              value={data.totals.month.teachers}
              hint={data.selectedMonth.label}
            />
          </div>

          <h3 className="panel__subtitle">Monthly joinings</h3>
          <JoiningChart points={data.monthly} />

          <h3 className="panel__subtitle">Growth trend</h3>
          <div className="stat-grid">
            <StatCard
              label="Student growth"
              value={data.growth.current.students}
              hint={growthHint(
                data.growth.studentDelta,
                data.growth.studentPercent,
                data.growth.previousLabel,
              )}
            />
            <StatCard
              label="Teacher growth"
              value={data.growth.current.teachers}
              hint={growthHint(
                data.growth.teacherDelta,
                data.growth.teacherPercent,
                data.growth.previousLabel,
              )}
            />
          </div>

          <h3 className="panel__subtitle">Academic year comparison</h3>
          <YearComparisonTable years={data.academicYears} />
        </>
      ) : null}
    </section>
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
    label: 'Fee Desk',
    description: 'Collection, outstanding and defaulters',
    to: '/fee-desk',
    icon: 'finance',
    permission: Permission.INVOICE_READ,
  },
  {
    label: 'New Invoice',
    description: 'Issue a fee invoice',
    to: '/invoices/new',
    icon: 'plus',
    permission: Permission.INVOICE_MANAGE,
  },
  {
    label: 'Record Payment',
    description: 'Log a fee payment',
    to: '/payments/new',
    icon: 'check',
    permission: Permission.PAYMENT_MANAGE,
  },
  {
    label: 'Report Cards',
    description: 'Build and print result cards',
    to: '/report-cards',
    icon: 'reports',
    roles: [Role.PRINCIPAL, Role.ADMIN, Role.TEACHER],
  },
  {
    label: 'Admissions',
    description: 'Enquiries and applications',
    to: '/resource/admissions',
    icon: 'admissions',
    permission: Permission.ADMISSION_READ,
  },
  {
    label: 'Requests',
    description: 'Certificates and service requests',
    to: '/resource/service-requests',
    icon: 'requests',
    permission: Permission.REQUEST_READ,
  },
];

function QuickActions({ role }: { role: Role }) {
  const actions = QUICK_ACTIONS.filter((action) => {
    if (action.roles && !action.roles.includes(role)) return false;
    return !action.permission || can(role, action.permission);
  });
  if (actions.length === 0) return null;

  return (
    <section className="panel">
      <h2 className="panel__title">Quick actions</h2>
      <div className="quick-actions">
        {actions.map((action) => (
          <Link key={action.to} className="action-card" to={action.to}>
            <span className="action-card__icon">
              <Icon name={action.icon} size={18} />
            </span>
            <span className="action-card__body">
              <span className="action-card__label">{action.label}</span>
              <span className="action-card__desc">{action.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { currency } = useSettings();
  const { user } = useAuth();
  const state = useAsync<DashboardData>(() => api.get<DashboardData>('/reports/dashboard'), []);

  if (state.forbidden) return <ForbiddenPage />;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="School overview at a glance" />

      {state.loading ? (
        <Spinner label="Loading dashboard…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <div className="dashboard">
          {user ? <QuickActions role={user.role} /> : null}

          <JoiningSection />

          <section className="panel">
            <h2 className="panel__title">People &amp; assets</h2>
            <div className="stat-grid">
              {Object.entries(state.data.counts).map(([key, value]) => (
                <StatCard key={key} label={titleCase(key)} value={formatStatValue(value)} />
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Admissions &amp; requests</h2>
            <div className="stat-grid">
              <StatCard
                label="Open admissions"
                value={formatStatValue(state.data.pipeline.openAdmissions)}
                hint="Enquiry, applied or under review"
                icon="admissions"
                tone="info"
              />
              <StatCard
                label="Pending requests"
                value={formatStatValue(state.data.pipeline.pendingRequests)}
                hint="Awaiting action"
                icon="requests"
                tone="warning"
              />
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Finance</h2>
            <div className="stat-grid">
              <StatCard label="Invoices" value={formatStatValue(state.data.finance.invoices)} />
              <StatCard
                label="Total billed"
                value={formatCurrency(state.data.finance.totalBilled, currency)}
              />
              <StatCard
                label="Collected"
                value={formatCurrency(state.data.finance.totalCollected, currency)}
              />
              <StatCard
                label="Outstanding"
                value={formatCurrency(state.data.finance.totalOutstanding, currency)}
              />
              <StatCard
                label="Collected this month"
                value={formatCurrency(state.data.finance.collectedThisMonth, currency)}
              />
            </div>
          </section>

          <AttendancePanel title="Attendance today" card={state.data.attendanceToday} />
          <AttendancePanel title="Attendance overall" card={state.data.attendanceOverall} />
        </div>
      ) : null}
    </div>
  );
}
