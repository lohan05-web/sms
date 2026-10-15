import { createTransportRouteSchema, updateTransportRouteSchema } from '@smartschool/shared';
import { CrudTab } from './CrudTab';
import { asString, formatCurrency } from '../../lib/format';
import type { FieldDef } from '../../lib/form';
import {
  displayCode,
  routeCapacityLabel,
  routeLabel as routeName,
  stopsLabel,
  vehicleApi,
} from '../../lib/vehicle';
import type { Column, Row } from '../../resources';

function stopsToText(row: Row): string {
  const stops = row.stops;
  if (!Array.isArray(stops)) return '';
  return stops
    .map((stop) => (stop && typeof stop === 'object' ? asString((stop as Row).name) : ''))
    .filter((name) => name.length > 0)
    .join(', ');
}

const COLUMNS: Column[] = [
  { header: 'Route ID', render: (row) => displayCode(row, 'routeCode') },
  { header: 'Route Name', render: (row) => routeName(row) },
  { header: 'Start Point', render: (row) => asString(row.startPoint) || '—' },
  { header: 'End Point', render: (row) => asString(row.endPoint) || '—' },
  { header: 'Stops', render: (row) => stopsLabel(row.stops) },
  { header: 'Pickup', render: (row) => asString(row.pickupTime) || '—' },
  { header: 'Drop', render: (row) => asString(row.dropTime) || '—' },
  { header: 'Capacity', render: (row) => routeCapacityLabel(row) },
  {
    header: 'Fare',
    render: (row) => (typeof row.fare === 'number' ? formatCurrency(row.fare) : '—'),
  },
];

const codeField = (): FieldDef => ({
  name: 'routeCode',
  label: 'Route ID',
  type: 'text',
  placeholder: 'ROUTE-001',
  help: 'Leave blank to generate automatically.',
});

const nameField = (): FieldDef => ({
  name: 'name',
  label: 'Route Name',
  type: 'text',
  required: true,
  placeholder: 'e.g. North Campus Loop',
});

const startField = (): FieldDef => ({
  name: 'startPoint',
  label: 'Start Point',
  type: 'text',
  placeholder: 'e.g. Central Station',
});

const endField = (): FieldDef => ({
  name: 'endPoint',
  label: 'End Point',
  type: 'text',
  placeholder: 'e.g. School Gate',
});

const stopsField = (): FieldDef => ({
  name: 'stops',
  label: 'Stops',
  type: 'text',
  placeholder: 'Stop A, Stop B, Stop C',
  help: 'Separate each stop with a comma.',
  toValue: stopsToText,
});

const pickupField = (): FieldDef => ({
  name: 'pickupTime',
  label: 'Pickup Time',
  type: 'text',
  placeholder: '07:30',
});

const dropField = (): FieldDef => ({
  name: 'dropTime',
  label: 'Drop Time',
  type: 'text',
  placeholder: '16:30',
});

const fareField = (): FieldDef => ({
  name: 'fare',
  label: 'Fare',
  type: 'number',
  min: 0,
  step: '0.01',
  defaultValue: 0,
});

const descriptionField = (): FieldDef => ({
  name: 'description',
  label: 'Description',
  type: 'textarea',
  placeholder: 'Optional notes about this route',
});

const ROUTE_FIELDS: FieldDef[] = [
  codeField(),
  nameField(),
  startField(),
  endField(),
  stopsField(),
  pickupField(),
  dropField(),
  fareField(),
  descriptionField(),
];

export function RoutesTab({
  canManage,
  onChanged,
}: {
  canManage: boolean;
  onChanged: () => void;
}) {
  return (
    <CrudTab
      singular="Route"
      plural="routes"
      columns={COLUMNS}
      load={vehicleApi.listRoutes}
      createSpec={{ fields: ROUTE_FIELDS, schema: createTransportRouteSchema }}
      editSpec={{ fields: ROUTE_FIELDS, schema: updateTransportRouteSchema }}
      canManage={canManage}
      emptyMessage="No routes yet. Create a route to assign vehicles and stops."
      onCreate={(values) => vehicleApi.createRoute(values)}
      onUpdate={(id, values) => vehicleApi.updateRoute(id, values)}
      onDelete={(id) => vehicleApi.deleteRoute(id)}
      onChanged={onChanged}
    />
  );
}
