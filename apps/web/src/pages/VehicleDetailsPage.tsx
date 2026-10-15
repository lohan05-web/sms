import { Permission } from '@smartschool/shared';
import { useState } from 'react';
import { PageHeader } from '../components/ui';
import { DriversTab } from '../components/vehicle/DriversTab';
import { RoutesTab } from '../components/vehicle/RoutesTab';
import { VehicleDashboard } from '../components/vehicle/VehicleDashboard';
import { VehiclesTab } from '../components/vehicle/VehiclesTab';
import { useAuth } from '../lib/auth';
import { can } from '../lib/permissions';
import { ForbiddenPage } from './ForbiddenPage';

type TabKey = 'dashboard' | 'vehicles' | 'routes' | 'drivers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'routes', label: 'Routes' },
  { key: 'drivers', label: 'Drivers' },
];

export function VehicleDetailsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [version, setVersion] = useState(0);

  if (!user || !can(user.role, Permission.TRANSPORT_READ)) return <ForbiddenPage />;

  const canManage = can(user.role, Permission.TRANSPORT_MANAGE);
  const onChanged = () => setVersion((value) => value + 1);

  return (
    <div className="page">
      <PageHeader
        title="Vehicle Details"
        subtitle="Manage your fleet, routes and drivers"
        icon="bus"
      />

      <div className="vehicle-tabs" role="tablist" aria-label="Vehicle details sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`vehicle-tabs__tab${tab === item.key ? ' vehicle-tabs__tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="vehicle-tabs__panel">
        {tab === 'dashboard' ? <VehicleDashboard version={version} /> : null}
        {tab === 'vehicles' ? <VehiclesTab canManage={canManage} onChanged={onChanged} /> : null}
        {tab === 'routes' ? <RoutesTab canManage={canManage} onChanged={onChanged} /> : null}
        {tab === 'drivers' ? <DriversTab canManage={canManage} onChanged={onChanged} /> : null}
      </div>
    </div>
  );
}
