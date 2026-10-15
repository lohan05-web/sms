import { createDriverSchema, updateDriverSchema } from '@smartschool/shared';
import type { ReactNode } from 'react';
import { CrudTab } from './CrudTab';
import { asString, formatDate } from '../../lib/format';
import type { FieldDef } from '../../lib/form';
import {
  daysRemainingLabel,
  daysUntil,
  displayCode,
  licenseTone,
  personName,
  vehicleApi,
} from '../../lib/vehicle';
import type { Column, Row } from '../../resources';

function expiryCell(row: Row): ReactNode {
  const days = daysUntil(row.licenseExpiry);
  const text = formatDate(row.licenseExpiry);
  if (days === null) return text;
  if (days <= 30) {
    return (
      <span className={`badge badge--${licenseTone(days)}`} title={daysRemainingLabel(days)}>
        {text} · {daysRemainingLabel(days)}
      </span>
    );
  }
  return text;
}

const COLUMNS: Column[] = [
  { header: 'Driver ID', render: (row) => displayCode(row, 'driverCode') },
  { header: 'Name', render: (row) => personName(row) },
  { header: 'Phone', render: (row) => asString(row.phone) || '—' },
  { header: 'License Number', render: (row) => asString(row.licenseNumber) || '—' },
  { header: 'License Expiry', render: (row) => expiryCell(row) },
];

const codeField = (): FieldDef => ({
  name: 'driverCode',
  label: 'Driver ID',
  type: 'text',
  placeholder: 'DRV-001',
  help: 'Leave blank to generate automatically.',
});

const nameField = (): FieldDef => ({
  name: 'name',
  label: 'Full Name',
  type: 'text',
  required: true,
  placeholder: 'e.g. Ravi Kumar',
});

const phoneField = (): FieldDef => ({
  name: 'phone',
  label: 'Phone',
  type: 'text',
  required: true,
  placeholder: 'e.g. 9876543210',
});

const licenseNumberField = (): FieldDef => ({
  name: 'licenseNumber',
  label: 'License Number',
  type: 'text',
  required: true,
  placeholder: 'e.g. DL-0420110149646',
});

const licenseExpiryField = (): FieldDef => ({
  name: 'licenseExpiry',
  label: 'License Expiry',
  type: 'date',
  required: true,
});

const DRIVER_FIELDS: FieldDef[] = [
  codeField(),
  nameField(),
  phoneField(),
  licenseNumberField(),
  licenseExpiryField(),
];

export function DriversTab({
  canManage,
  onChanged,
}: {
  canManage: boolean;
  onChanged: () => void;
}) {
  return (
    <CrudTab
      singular="Driver"
      plural="drivers"
      columns={COLUMNS}
      load={vehicleApi.listDrivers}
      createSpec={{ fields: DRIVER_FIELDS, schema: createDriverSchema }}
      editSpec={{ fields: DRIVER_FIELDS, schema: updateDriverSchema }}
      canManage={canManage}
      emptyMessage="No drivers yet. Add a driver to assign to your vehicles."
      onCreate={(values) => vehicleApi.createDriver(values)}
      onUpdate={(id, values) => vehicleApi.updateDriver(id, values)}
      onDelete={(id) => vehicleApi.deleteDriver(id)}
      onChanged={onChanged}
    />
  );
}
