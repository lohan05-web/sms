import { createVehicleSchema, updateVehicleSchema } from '@smartschool/shared';
import { CrudTab } from './CrudTab';
import { asString, humanize } from '../../lib/format';
import type { FieldDef } from '../../lib/form';
import {
  VEHICLE_STATUS_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  vehicleApi,
  vehicleStatusCode,
  vehicleStatusLabel,
  vehicleStatusTone,
} from '../../lib/vehicle';
import type { Column, Row } from '../../resources';

function driverLabel(row: Row): string {
  const driver = row.driver;
  if (driver && typeof driver === 'object') {
    const name = asString((driver as Row).name);
    const code = asString((driver as Row).driverCode);
    if (name) return code ? `${name} (${code})` : name;
  }
  return asString(row.driverName) || '—';
}

function routeLabel(row: Row): string {
  const route = row.route;
  if (route && typeof route === 'object') {
    const name = asString((route as Row).name);
    const code = asString((route as Row).routeCode) || asString((route as Row).code);
    if (name) return code ? `${name} (${code})` : name;
  }
  return '—';
}

const COLUMNS: Column[] = [
  { header: 'Vehicle ID', render: (row) => vehicleStatusCode(row) },
  { header: 'Vehicle Number', render: (row) => asString(row.plateNumber) || '—' },
  { header: 'Type', render: (row) => (row.type ? humanize(row.type) : '—') },
  {
    header: 'Capacity',
    render: (row) => (typeof row.capacity === 'number' ? row.capacity : '—'),
  },
  { header: 'Driver', render: (row) => driverLabel(row) },
  { header: 'Route', render: (row) => routeLabel(row) },
  {
    header: 'Status',
    render: (row) => (
      <span className={`badge badge--${vehicleStatusTone(row)}`}>{vehicleStatusLabel(row)}</span>
    ),
  },
];

const codeField = (): FieldDef => ({
  name: 'vehicleCode',
  label: 'Vehicle ID',
  type: 'text',
  placeholder: 'VEH-001',
  help: 'Leave blank to generate automatically.',
});

const plateField = (): FieldDef => ({
  name: 'plateNumber',
  label: 'Vehicle Number',
  type: 'text',
  required: true,
  placeholder: 'e.g. KA-01-AB-1234',
});

const typeField = (): FieldDef => ({
  name: 'type',
  label: 'Type',
  type: 'select',
  options: VEHICLE_TYPE_OPTIONS,
  defaultValue: 'BUS',
});

const capacityField = (): FieldDef => ({
  name: 'capacity',
  label: 'Capacity',
  type: 'number',
  required: true,
  min: 1,
  step: '1',
  defaultValue: 1,
});

const statusField = (): FieldDef => ({
  name: 'status',
  label: 'Status',
  type: 'select',
  options: VEHICLE_STATUS_OPTIONS,
});

const modelField = (): FieldDef => ({
  name: 'model',
  label: 'Model',
  type: 'text',
  placeholder: 'e.g. Tata Starbus',
});

const driverField = (): FieldDef => ({
  name: 'driverId',
  label: 'Driver',
  type: 'select',
  lookup: 'drivers',
});

const routeField = (): FieldDef => ({
  name: 'routeId',
  label: 'Route',
  type: 'select',
  lookup: 'routes',
});

const insuranceField = (): FieldDef => ({
  name: 'insuranceExpiry',
  label: 'Insurance expiry',
  type: 'date',
});

const CREATE_FIELDS: FieldDef[] = [
  codeField(),
  plateField(),
  typeField(),
  capacityField(),
  modelField(),
  driverField(),
  routeField(),
  insuranceField(),
];

const EDIT_FIELDS: FieldDef[] = [
  codeField(),
  plateField(),
  typeField(),
  capacityField(),
  statusField(),
  modelField(),
  driverField(),
  routeField(),
  insuranceField(),
];

export function VehiclesTab({
  canManage,
  onChanged,
}: {
  canManage: boolean;
  onChanged: () => void;
}) {
  return (
    <CrudTab
      singular="Vehicle"
      plural="vehicles"
      columns={COLUMNS}
      load={vehicleApi.listVehicles}
      createSpec={{ fields: CREATE_FIELDS, schema: createVehicleSchema }}
      editSpec={{ fields: EDIT_FIELDS, schema: updateVehicleSchema }}
      canManage={canManage}
      emptyMessage="No vehicles yet. Add your first vehicle to get started."
      onCreate={(values) => vehicleApi.createVehicle(values)}
      onUpdate={(id, values) => vehicleApi.updateVehicle(id, values)}
      onDelete={(id) => vehicleApi.deleteVehicle(id)}
      onChanged={onChanged}
    />
  );
}
