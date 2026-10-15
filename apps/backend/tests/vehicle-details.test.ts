import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => {
  const client: Record<string, any> = {
    driver: {},
    vehicle: {},
    transportRoute: {},
    routeStop: {},
    $transaction: vi.fn(),
  };
  return { prisma: client };
});

vi.mock('../src/lib/prisma', () => ({ prisma }));

import { driversService } from '../src/modules/drivers/drivers.service';
import { transportRoutesService } from '../src/modules/transport-routes/transport-routes.service';
import { vehicleStatsService } from '../src/modules/vehicle-stats/vehicle-stats.service';
import { vehiclesService } from '../src/modules/vehicles/vehicles.service';
import type { Actor } from '../src/modules/users/users.service';

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };

function modelMethods(names: string[]) {
  const model: Record<string, any> = {};
  for (const name of names) model[name] = vi.fn();
  return model;
}

function resetClient() {
  prisma.driver = modelMethods([
    'findMany',
    'findFirst',
    'findUnique',
    'create',
    'update',
    'delete',
    'count',
  ]);
  prisma.vehicle = modelMethods([
    'findMany',
    'findFirst',
    'findUnique',
    'create',
    'update',
    'delete',
    'count',
  ]);
  prisma.transportRoute = modelMethods([
    'findMany',
    'findFirst',
    'findUnique',
    'findUniqueOrThrow',
    'create',
    'update',
    'delete',
    'count',
  ]);
  prisma.routeStop = modelMethods(['createMany', 'deleteMany']);
  prisma.$transaction.mockReset();
  prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
}

beforeEach(() => {
  resetClient();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('driversService', () => {
  it('auto-generates the next sequential driver code', async () => {
    prisma.driver.findFirst.mockResolvedValue(null);
    prisma.driver.findMany.mockResolvedValue([{ driverCode: 'DRV-002' }, { driverCode: 'DRV-007' }]);
    prisma.driver.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'd1', ...data }));

    const driver = await driversService.create(
      { name: 'Sam Driver', phone: '12345678', licenseNumber: 'LIC-1', licenseExpiry: new Date() },
      admin,
    );

    expect(driver.driverCode).toBe('DRV-008');
    expect(prisma.driver.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ schoolId: 'school-1', driverCode: 'DRV-008' }),
    });
  });

  it('rejects duplicate license numbers', async () => {
    prisma.driver.findFirst.mockResolvedValue({ id: 'd9' });

    await expect(
      driversService.create(
        { name: 'Dup', phone: '12345678', licenseNumber: 'LIC-1', licenseExpiry: new Date() },
        admin,
      ),
    ).rejects.toThrow('license number already exists');
  });

  it('blocks deleting a driver that is assigned to a vehicle', async () => {
    prisma.driver.findUnique.mockResolvedValue({ id: 'd1', schoolId: 'school-1' });
    prisma.vehicle.count.mockResolvedValue(2);

    await expect(driversService.remove('d1', admin)).rejects.toThrow('cannot be deleted');
    expect(prisma.driver.delete).not.toHaveBeenCalled();
  });
});

describe('vehiclesService', () => {
  it('auto-generates a vehicle code and links the driver', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);
    prisma.driver.findUnique.mockResolvedValue({ id: 'd1', schoolId: 'school-1', name: 'Sam', phone: '999' });
    prisma.vehicle.findMany.mockResolvedValue([{ vehicleCode: 'VEH-001' }]);
    prisma.vehicle.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'v1', ...data }));

    const vehicle = await vehiclesService.create(
      {
        plateNumber: 'ABC-123',
        capacity: 40,
        type: 'BUS',
        driverId: 'd1',
      },
      admin,
    );

    expect(vehicle.vehicleCode).toBe('VEH-002');
    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: 'school-1',
        vehicleCode: 'VEH-002',
        driverId: 'd1',
        driverName: 'Sam',
      }),
    });
  });

  it('rejects a driver that belongs to another school', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);
    prisma.driver.findUnique.mockResolvedValue({ id: 'd1', schoolId: 'other' });

    await expect(
      vehiclesService.create({ plateNumber: 'ABC-1', capacity: 10, type: 'VAN', driverId: 'd1' }, admin),
    ).rejects.toThrow('Invalid driver');
  });

  it('rejects duplicate plate numbers', async () => {
    prisma.vehicle.findFirst.mockResolvedValue({ id: 'v9' });

    await expect(
      vehiclesService.create({ plateNumber: 'ABC-1', capacity: 10, type: 'VAN' }, admin),
    ).rejects.toThrow('already exists');
  });
});

describe('transportRoutesService', () => {
  it('generates a route code and syncs stops inside a transaction', async () => {
    prisma.transportRoute.findMany.mockResolvedValue([{ routeCode: 'ROUTE-001', code: 'ROUTE-001' }]);
    prisma.transportRoute.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'r1', ...data }),
    );
    prisma.routeStop.createMany.mockResolvedValue({ count: 3 });
    prisma.transportRoute.findUniqueOrThrow.mockResolvedValue({ id: 'r1', stops: [] });

    await transportRoutesService.create({ name: 'North Route', fare: 0, stops: ['A', 'B', 'C'] }, admin);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.transportRoute.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ routeCode: 'ROUTE-002', code: 'ROUTE-002' }),
    });
    expect(prisma.routeStop.createMany).toHaveBeenCalledWith({
      data: [
        { routeId: 'r1', name: 'A', sequence: 1 },
        { routeId: 'r1', name: 'B', sequence: 2 },
        { routeId: 'r1', name: 'C', sequence: 3 },
      ],
    });
  });

  it('blocks deleting a route assigned to a vehicle', async () => {
    prisma.transportRoute.findUnique.mockResolvedValue({ id: 'r1', schoolId: 'school-1', vehicleId: null });
    prisma.vehicle.count.mockResolvedValue(1);

    await expect(transportRoutesService.remove('r1', admin)).rejects.toThrow('cannot be deleted');
    expect(prisma.transportRoute.delete).not.toHaveBeenCalled();
  });
});

describe('vehicleStatsService', () => {
  it('aggregates counts, route capacity and license urgency', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 0, 1)));

    const soon = new Date(Date.UTC(2026, 0, 20));
    const expired = new Date(Date.UTC(2025, 11, 1));

    prisma.vehicle.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(7) // active
      .mockResolvedValueOnce(2) // maintenance
      .mockResolvedValueOnce(1) // inactive
      .mockResolvedValueOnce(6) // bus
      .mockResolvedValueOnce(4); // van
    prisma.driver.count
      .mockResolvedValueOnce(5) // total drivers
      .mockResolvedValueOnce(1); // expiring in 30 days
    prisma.transportRoute.count.mockResolvedValue(2);
    prisma.transportRoute.findMany.mockResolvedValue([
      { id: 'r1', routeCode: 'ROUTE-001', code: 'ROUTE-001', name: 'North', vehicles: [{ capacity: 40 }, { capacity: 20 }] },
    ]);
    prisma.driver.findMany.mockResolvedValue([
      { id: 'd1', driverCode: 'DRV-001', name: 'Expired', phone: '1', licenseNumber: 'L1', licenseExpiry: expired },
      { id: 'd2', driverCode: 'DRV-002', name: 'Soon', phone: '2', licenseNumber: 'L2', licenseExpiry: soon },
    ]);

    const stats = await vehicleStatsService.get(admin);

    expect(stats.totalVehicles).toBe(10);
    expect(stats.activeVehicles).toBe(7);
    expect(stats.vehiclesInMaintenance).toBe(2);
    expect(stats.totalDrivers).toBe(5);
    expect(stats.totalRoutes).toBe(2);
    expect(stats.licensesExpiringIn30Days).toBe(1);
    expect(stats.vehiclesByType).toEqual([
      { type: 'BUS', count: 6 },
      { type: 'VAN', count: 4 },
    ]);
    expect(stats.routeCapacity).toEqual([
      { routeId: 'r1', routeCode: 'ROUTE-001', name: 'North', capacity: 60 },
    ]);
    expect(stats.expiringLicenses[0]).toMatchObject({ driverCode: 'DRV-001', daysRemaining: -31, status: 'EXPIRED' });
    expect(stats.expiringLicenses[1]).toMatchObject({ driverCode: 'DRV-002', daysRemaining: 19, status: 'EXPIRING_SOON' });
  });
});
