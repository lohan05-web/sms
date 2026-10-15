import { describe, expect, it } from 'vitest';
import {
  daysRemainingLabel,
  daysUntil,
  displayCode,
  routeCapacityLabel,
  stopsLabel,
  vehicleStatusCode,
  vehicleStatusLabel,
  vehicleStatusTone,
} from './vehicle';

function utcDateOffset(days: number): string {
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
  return target.toISOString().slice(0, 10);
}

describe('daysUntil', () => {
  it('returns the whole-day difference for future dates', () => {
    expect(daysUntil(utcDateOffset(10))).toBe(10);
  });

  it('returns a negative count for past dates', () => {
    expect(daysUntil(utcDateOffset(-3))).toBe(-3);
  });

  it('returns zero for today', () => {
    expect(daysUntil(utcDateOffset(0))).toBe(0);
  });

  it('ignores a trailing time component', () => {
    expect(daysUntil(`${utcDateOffset(5)}T00:00:00.000Z`)).toBe(5);
  });

  it('returns null for unparseable input', () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil('')).toBeNull();
    expect(daysUntil('not-a-date')).toBeNull();
  });
});

describe('daysRemainingLabel', () => {
  it('describes expired licenses', () => {
    expect(daysRemainingLabel(-3)).toBe('Expired 3 days ago');
    expect(daysRemainingLabel(-1)).toBe('Expired 1 day ago');
  });

  it('describes today and tomorrow', () => {
    expect(daysRemainingLabel(0)).toBe('Expires today');
    expect(daysRemainingLabel(1)).toBe('Expires tomorrow');
  });

  it('describes upcoming expiries', () => {
    expect(daysRemainingLabel(12)).toBe('Expires in 12 days');
  });
});

describe('stopsLabel', () => {
  it('joins stop names', () => {
    expect(
      stopsLabel([
        { name: 'Stop A', sequence: 1 },
        { name: 'Stop B', sequence: 2 },
      ]),
    ).toBe('Stop A · Stop B');
  });

  it('returns a dash when there are no stops', () => {
    expect(stopsLabel([])).toBe('—');
    expect(stopsLabel(undefined)).toBe('—');
  });
});

describe('routeCapacityLabel', () => {
  it('sums the vehicle capacities', () => {
    expect(routeCapacityLabel({ vehicles: [{ capacity: 30 }, { capacity: 20 }] })).toBe('50 seats');
  });

  it('returns a dash when no vehicles are assigned', () => {
    expect(routeCapacityLabel({ vehicles: [] })).toBe('—');
    expect(routeCapacityLabel({})).toBe('—');
  });
});

describe('displayCode', () => {
  it('prefers the dedicated code field', () => {
    expect(displayCode({ driverCode: 'DRV-001' }, 'driverCode')).toBe('DRV-001');
  });

  it('falls back to the legacy code field', () => {
    expect(displayCode({ code: 'ROUTE-9' }, 'routeCode')).toBe('ROUTE-9');
  });

  it('returns a dash when neither is present', () => {
    expect(displayCode({}, 'vehicleCode')).toBe('—');
  });
});

describe('vehicle status helpers', () => {
  it('resolves the code with a dash fallback', () => {
    expect(vehicleStatusCode({ vehicleCode: 'VEH-004' })).toBe('VEH-004');
    expect(vehicleStatusCode({})).toBe('—');
  });

  it('maps statuses to labels and tones', () => {
    expect(vehicleStatusLabel({ status: 'ACTIVE' })).toBe('Active');
    expect(vehicleStatusLabel({ status: 'MAINTENANCE' })).toBe('Maintenance');
    expect(vehicleStatusLabel({})).toBe('—');
    expect(vehicleStatusTone({ status: 'ACTIVE' })).toBe('success');
    expect(vehicleStatusTone({ status: 'MAINTENANCE' })).toBe('warning');
    expect(vehicleStatusTone({ status: 'INACTIVE' })).toBe('danger');
    expect(vehicleStatusTone({})).toBe('danger');
  });
});
