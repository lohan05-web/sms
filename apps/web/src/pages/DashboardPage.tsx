import { PageHeader, StatCard, Spinner, ErrorState, formatStatValue } from '../components/ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatCurrency } from '../lib/format';
import { useSettings } from '../lib/settings';
import { ForbiddenPage } from './ForbiddenPage';

interface DashboardData {
  counts: Record<string, number>;
  finance: {
    invoices: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectedThisMonth: number;
    byStatus: Record<string, number>;
  };
  attendanceToday: {
    total: number;
    byStatus: Record<string, number>;
  };
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DashboardPage() {
  const { currency } = useSettings();
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
          <section className="panel">
            <h2 className="panel__title">People &amp; assets</h2>
            <div className="stat-grid">
              {Object.entries(state.data.counts).map(([key, value]) => (
                <StatCard key={key} label={titleCase(key)} value={formatStatValue(value)} />
              ))}
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

          <section className="panel">
            <h2 className="panel__title">Attendance today</h2>
            <div className="stat-grid">
              <StatCard
                label="Total marks"
                value={formatStatValue(state.data.attendanceToday.total)}
              />
              {Object.entries(state.data.attendanceToday.byStatus).map(([key, value]) => (
                <StatCard key={key} label={titleCase(key)} value={formatStatValue(value)} />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
