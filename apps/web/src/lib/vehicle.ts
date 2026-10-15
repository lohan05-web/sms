import type { Option } from './options';
import { api } from './api';
import type { Row } from '../resources';

export type VehicleType = 'BUS' | 'VAN';
export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface VehicleRecord extends Row {
  id: string;
  vehicleCode?: string | null;
  plateNumber?: string | null;
  model?: string | null;
  type?: VehicleType | null;
  capacity?: number | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  routeId?: string | null;
  status?: VehicleStatus | null;
  insuranceExpiry?: string | null;
  driver?: { id: string; driverCode?: string | null; name?: string | null } | null;
  route?: { id: string; routeCode?: string | null; code?: string | null; name?: string | null } | null;
}

export interface DriverRecord extends Row {
  id: string;
  driverCode?: string | null;
  name?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  vehicles?: { id: string; vehicleCode?: string | null; plateNumber?: string | null }[];
}

export interface RouteRecord extends Row {
  id: string;
  routeCode?: string | null;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  startPoint?: string | null;
  endPoint?: string | null;
  pickupTime?: string | null;
  dropTime?: string | null;
  fare?: number | null;
  stops?: { id: string; name: string; sequence: number }[];
  vehicles?: { id: string; vehicleCode?: string | null; plateNumber?: string | null; capacity?: number | null }[];
}

export interface ExpiringLicense {
  driverId: string;
  driverCode: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'EXPIRING_SOON';
}

export interface VehicleStats {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  totalDrivers: number;
  totalRoutes: number;
  licensesExpiringIn30Days: number;
  vehiclesByStatus: { status: string; count: number }[];
  vehiclesByType: { type: string; count: number }[];
  routeCapacity: { routeId: string; routeCode: string | null; name: string; capacity: number }[];
  expiringLicenses: ExpiringLicense[];
}

export const VEHICLE_TYPE_OPTIONS: Option[] = [
  { value: 'BUS', label: 'Bus' },
  { value: 'VAN', label: 'Van' },
];

export const VEHICLE_STATUS_OPTIONS: Option[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export const VEHICLE_STATUS_TONE: Record<VehicleStatus, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  MAINTENANCE: 'warning',
  INACTIVE: 'danger',
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Active',
  MAINTENANCE: 'Maintenance',
  INACTIVE: 'Inactive',
};

export function vehicleStatusCode(row: Row): string {
  const code = row.vehicleCode;
  return typeof code === 'string' && code ? code : '—';
}

export function vehicleStatusLabel(row: Row): string {
  const status = row.status;
  return typeof status === 'string' && status in STATUS_LABELS
    ? STATUS_LABELS[status as VehicleStatus]
    : '—';
}

export function vehicleStatusTone(row: Row): 'success' | 'warning' | 'danger' {
  const status = row.status;
  return status === 'ACTIVE' || status === 'MAINTENANCE' || status === 'INACTIVE'
    ? VEHICLE_STATUS_TONE[status]
    : 'danger';
}

export function personName(row: Row): string {
  const name = row.name;
  return typeof name === 'string' && name ? name : '—';
}

export function routeLabel(row: Row): string {
  const name = row.name;
  return typeof name === 'string' && name ? name : '—';
}

/** Resolve the display code for a driver or route row (falls back to legacy `code`). */
export function displayCode(row: Row, key: 'driverCode' | 'routeCode' | 'vehicleCode'): string {
  const value = row[key] ?? row.code;
  return typeof value === 'string' && value ? value : '—';
}

export function stopsLabel(stops: unknown): string {
  if (!Array.isArray(stops) || stops.length === 0) return '—';
  const names = stops
    .map((stop) => (stop && typeof stop === 'object' ? (stop as Row).name : undefined))
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
  return names.length > 0 ? names.join(' · ') : '—';
}

export function routeCapacityLabel(row: Row): string {
  const vehicles = row.vehicles;
  if (!Array.isArray(vehicles) || vehicles.length === 0) return '—';
  const total = vehicles.reduce<number>(
    (sum, vehicle) =>
      sum + (vehicle && typeof vehicle === 'object' && typeof (vehicle as Row).capacity === 'number'
        ? ((vehicle as Row).capacity as number)
        : 0),
    0,
  );
  return `${total} seats`;
}

export function daysRemainingLabel(days: number): string {
  if (days < 0) {
    const count = Math.abs(days);
    return `Expired ${count} ${count === 1 ? 'day' : 'days'} ago`;
  }
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

/** Whole days from today (UTC) to a yyyy-mm-dd date, or null when unparseable. */
export function daysUntil(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const target = Date.UTC(
    Number(match[1] ?? '0'),
    Number(match[2] ?? '1') - 1,
    Number(match[3] ?? '1'),
  );
  if (!Number.isFinite(target)) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86400000);
}

export function licenseTone(daysRemaining: number): 'danger' | 'warning' {
  return daysRemaining <= 0 ? 'danger' : 'warning';
}

export const vehicleApi = {
  stats: () => api.get<VehicleStats>('/vehicle/stats'),

  listVehicles: (params?: Record<string, unknown>) =>
    api.list<VehicleRecord>('/vehicles', params),
  createVehicle: (payload: Record<string, unknown>) =>
    api.post<VehicleRecord>('/vehicles', payload),
  updateVehicle: (id: string, payload: Record<string, unknown>) =>
    api.patch<VehicleRecord>(`/vehicles/${id}`, payload),
  deleteVehicle: (id: string) => api.delete(`/vehicles/${id}`),

  listDrivers: (params?: Record<string, unknown>) => api.list<DriverRecord>('/drivers', params),
  createDriver: (payload: Record<string, unknown>) => api.post<DriverRecord>('/drivers', payload),
  updateDriver: (id: string, payload: Record<string, unknown>) =>
    api.patch<DriverRecord>(`/drivers/${id}`, payload),
  deleteDriver: (id: string) => api.delete(`/drivers/${id}`),

  listRoutes: (params?: Record<string, unknown>) =>
    api.list<RouteRecord>('/transport-routes', params),
  createRoute: (payload: Record<string, unknown>) =>
    api.post<RouteRecord>('/transport-routes', payload),
  updateRoute: (id: string, payload: Record<string, unknown>) =>
    api.patch<RouteRecord>(`/transport-routes/${id}`, payload),
  deleteRoute: (id: string) => api.delete(`/transport-routes/${id}`),
};
