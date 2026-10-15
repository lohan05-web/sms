import { DataTable } from '../components/DataTable';
import { ErrorState, PageHeader, SkeletonPanels, StatCard, formatStatValue } from '../components/ui';
import { api } from '../lib/api';
import { formatCurrency, formatDate, humanize } from '../lib/format';
import { useSettings } from '../lib/settings';
import { useAsync } from '../lib/useAsync';
import type { Column, Row } from '../resources';
import { ForbiddenPage } from './ForbiddenPage';

interface AttendanceReport {
  from: string;
  to: string;
  total: number;
  attendanceRate: number;
  byStatus: Record<string, number>;
}

interface FeesReport {
  from: string;
  to: string;
  totals: { invoices: number; billed: number; collected: number; outstanding: number };
  byStatus: Record<string, number>;
  paymentsByMethod: { method: string; count: number; amount: number }[];
}

interface EnrollmentReport {
  totalStudents: number;
  byClassLevel: {
    id: string;
    name: string;
    numericLevel: number;
    sections: number;
    students: number;
  }[];
}

interface ReportsData {
  attendance: AttendanceReport;
  fees: FeesReport;
  enrollment: EnrollmentReport;
}

const statusColumns: Column[] = [
  { header: 'Status', render: (row) => humanize(row.status) },
  { header: 'Count', render: (row) => formatStatValue(row.count) },
];

const levelColumns: Column[] = [
  { header: 'Class level', render: (row) => String(row.name ?? '—') },
  { header: 'Sections', render: (row) => formatStatValue(row.sections) },
  { header: 'Students', render: (row) => formatStatValue(row.students) },
];

function entriesToRows(source: Record<string, number>): Row[] {
  return Object.entries(source).map(([status, count]) => ({ status, count }));
}

export function ReportsPage() {
  const { currency } = useSettings();
  const state = useAsync<ReportsData>(
    () =>
      Promise.all([
        api.get<AttendanceReport>('/reports/attendance'),
        api.get<FeesReport>('/reports/fees'),
        api.get<EnrollmentReport>('/reports/enrollment'),
      ]).then(([attendance, fees, enrollment]) => ({ attendance, fees, enrollment })),
    [],
  );

  if (state.forbidden) return <ForbiddenPage />;

  const methodColumns: Column[] = [
    { header: 'Method', render: (row) => humanize(row.method) },
    { header: 'Count', render: (row) => formatStatValue(row.count) },
    { header: 'Amount', render: (row) => formatCurrency(row.amount, currency) },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        subtitle="Attendance, finance and enrollment insights"
        actions={
          <button type="button" className="btn btn--ghost" onClick={state.reload}>
            Refresh
          </button>
        }
      />

      {state.loading ? (
        <SkeletonPanels count={3} />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <div className="dashboard">
          <section className="panel">
            <h2 className="panel__title">Attendance</h2>
            <p className="panel__meta">
              {formatDate(state.data.attendance.from)} – {formatDate(state.data.attendance.to)}
            </p>
            <div className="stat-grid">
              <StatCard label="Total marks" value={formatStatValue(state.data.attendance.total)} />
              <StatCard
                label="Attendance rate"
                value={`${state.data.attendance.attendanceRate}%`}
              />
            </div>
            <DataTable
              columns={statusColumns}
              rows={entriesToRows(state.data.attendance.byStatus)}
              emptyMessage="No attendance data."
            />
          </section>

          <section className="panel">
            <h2 className="panel__title">Fees</h2>
            <p className="panel__meta">
              {formatDate(state.data.fees.from)} – {formatDate(state.data.fees.to)}
            </p>
            <div className="stat-grid">
              <StatCard label="Invoices" value={formatStatValue(state.data.fees.totals.invoices)} />
              <StatCard
                label="Billed"
                value={formatCurrency(state.data.fees.totals.billed, currency)}
              />
              <StatCard
                label="Collected"
                value={formatCurrency(state.data.fees.totals.collected, currency)}
              />
              <StatCard
                label="Outstanding"
                value={formatCurrency(state.data.fees.totals.outstanding, currency)}
              />
            </div>
            <h3 className="panel__subtitle">Payments by method</h3>
            <DataTable
              columns={methodColumns}
              rows={state.data.fees.paymentsByMethod}
              emptyMessage="No payments recorded."
            />
          </section>

          <section className="panel">
            <h2 className="panel__title">Enrollment</h2>
            <div className="stat-grid">
              <StatCard
                label="Total students"
                value={formatStatValue(state.data.enrollment.totalStudents)}
              />
            </div>
            <DataTable columns={levelColumns} rows={state.data.enrollment.byClassLevel} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
