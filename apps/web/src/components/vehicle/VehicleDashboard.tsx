import {
  BadgeCheck,
  Bus,
  CalendarClock,
  RefreshCw,
  Route as RouteIcon,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState, ErrorState, SkeletonPanels, SkeletonStats } from '../ui';
import { formatDate, humanize } from '../../lib/format';
import { daysRemainingLabel, daysUntil, vehicleApi, type VehicleStats } from '../../lib/vehicle';
import { useAsync } from '../../lib/useAsync';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  MAINTENANCE: '#f59e0b',
  INACTIVE: '#ef4444',
};

const TYPE_COLORS: Record<string, string> = {
  BUS: '#14b8a6',
  VAN: '#0f766e',
};

function KpiCard({
  icon: IconCmp,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'cyan' | 'red';
}) {
  return (
    <div className={`vehicle-kpi vehicle-kpi--${tone}`}>
      <span className="vehicle-kpi__icon">
        <IconCmp size={20} strokeWidth={2} />
      </span>
      <div className="vehicle-kpi__body">
        <span className="vehicle-kpi__value">{value}</span>
        <span className="vehicle-kpi__label">{label}</span>
        {hint ? <span className="vehicle-kpi__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`panel vehicle-panel${wide ? ' vehicle-panel--wide' : ''}`}>
      <header className="panel__header">
        <h2 className="panel__title">{title}</h2>
        {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function LicenseTable({ licenses }: { licenses: VehicleStats['expiringLicenses'] }) {
  if (licenses.length === 0) {
    return <EmptyState message="No licenses are expiring in the next 30 days." icon="check" />;
  }
  return (
    <div className="table-wrap table-wrap--responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Driver ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>License</th>
            <th>Expiry</th>
            <th>Days Remaining</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {licenses.map((license) => {
            const expired = license.status === 'EXPIRED' || license.daysRemaining < 0;
            const days = license.daysRemaining;
            return (
              <tr key={license.driverId}>
                <td data-label="Driver ID">{license.driverCode || '—'}</td>
                <td data-label="Name">{license.name || '—'}</td>
                <td data-label="Phone">{license.phone || '—'}</td>
                <td data-label="License">{license.licenseNumber || '—'}</td>
                <td data-label="Expiry">{formatDate(license.licenseExpiry)}</td>
                <td data-label="Days Remaining">
                  {days} {days === 1 ? 'day' : 'days'}
                </td>
                <td data-label="Status">
                  <span className={`badge badge--${expired ? 'danger' : 'warning'}`}>
                    {daysRemainingLabel(days)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function VehicleDashboard({ version }: { version: number }) {
  const state = useAsync<VehicleStats>(() => vehicleApi.stats(), [version]);

  if (state.loading && !state.data) {
    return (
      <div className="vehicle-dash">
        <SkeletonStats count={6} />
        <SkeletonPanels count={3} />
      </div>
    );
  }

  if (state.error) {
    return <ErrorState message={state.error} onRetry={state.reload} />;
  }

  const stats = state.data;
  if (!stats) {
    return <EmptyState message="No transport data available yet." icon="bus" />;
  }

  if (stats.totalVehicles === 0 && stats.totalDrivers === 0 && stats.totalRoutes === 0) {
    return (
      <EmptyState
        message="No transport data yet. Add vehicles, routes and drivers to see analytics."
        icon="bus"
      />
    );
  }

  const statusData = stats.vehiclesByStatus.map((item) => ({
    name: humanize(item.status),
    status: item.status,
    value: item.count,
  }));
  const typeData = stats.vehiclesByType.map((item) => ({
    name: humanize(item.type),
    type: item.type,
    count: item.count,
  }));
  const capacityData = stats.routeCapacity.map((item) => ({
    name: item.name,
    capacity: item.capacity,
  }));
  const licenseAlert = stats.licensesExpiringIn30Days;

  return (
    <div className="vehicle-dash">
      <header className="vehicle-dash__head">
        <div>
          <h2 className="vehicle-dash__title">Fleet overview</h2>
          <p className="vehicle-dash__subtitle">
            Live counts for vehicles, drivers, routes and license renewals.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={state.reload}
          disabled={state.loading}
        >
          <RefreshCw size={15} strokeWidth={2} />
          Refresh
        </button>
      </header>

      <section className="vehicle-kpis" aria-label="Key metrics">
        <KpiCard icon={Bus} label="Total Vehicles" value={stats.totalVehicles} tone="blue" />
        <KpiCard icon={BadgeCheck} label="Active Vehicles" value={stats.activeVehicles} tone="green" />
        <KpiCard
          icon={Wrench}
          label="In Maintenance"
          value={stats.vehiclesInMaintenance}
          tone="amber"
        />
        <KpiCard icon={Users} label="Total Drivers" value={stats.totalDrivers} tone="violet" />
        <KpiCard icon={RouteIcon} label="Total Routes" value={stats.totalRoutes} tone="cyan" />
        <KpiCard
          icon={CalendarClock}
          label="Licenses Expiring (30d)"
          value={licenseAlert}
          tone={licenseAlert > 0 ? 'red' : 'green'}
          hint={licenseAlert > 0 ? 'Action needed' : 'All up to date'}
        />
      </section>

      <div className="vehicle-charts">
        <Panel title="Vehicles by Status" subtitle="Distribution across the fleet">
          <div className="vehicle-chart">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Vehicles by Type" subtitle="Buses versus vans">
          <div className="vehicle-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={typeData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {typeData.map((entry) => (
                    <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? '#14b8a6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Route Capacity" subtitle="Total seats assigned per route" wide>
          {capacityData.length === 0 ? (
            <EmptyState message="No routes configured yet." icon="bus" />
          ) : (
            <div className="vehicle-chart">
              <ResponsiveContainer width="100%" height={Math.max(240, capacityData.length * 42)}>
                <BarChart
                  data={capacityData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                >
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="capacity" fill="#14b8a6" radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="License Expiry"
          subtitle="Expired or expiring within 30 days — most urgent first"
          wide
        >
          <LicenseTable licenses={stats.expiringLicenses} />
        </Panel>
      </div>

      <p className="vehicle-dash__footnote">
        {licenseAlert > 0 ? (
          <>
            <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" /> {licenseAlert}{' '}
            {licenseAlert === 1 ? 'license needs' : 'licenses need'} attention.
          </>
        ) : (
          <>
            <BadgeCheck size={14} strokeWidth={2} aria-hidden="true" /> All driver licenses are up to
            date.
          </>
        )}
        {(() => {
          const next = stats.expiringLicenses
            .map((license) => daysUntil(license.licenseExpiry))
            .find((days) => days !== null && days >= 0);
          return typeof next === 'number'
            ? ` Next renewal in ${next} ${next === 1 ? 'day' : 'days'}.`
            : '';
        })()}
      </p>
    </div>
  );
}
