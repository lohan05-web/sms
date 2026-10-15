import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export type VehicleStats = {
  totalVehicles: number;
  activeVehicles: number;
  vehiclesInMaintenance: number;
  totalDrivers: number;
  totalRoutes: number;
  licensesExpiringIn30Days: number;
  vehiclesByStatus: { status: string; count: number }[];
  vehiclesByType: { type: string; count: number }[];
  routeCapacity: { routeId: string; routeCode: string | null; name: string; capacity: number }[];
  expiringLicenses: {
    driverId: string;
    driverCode: string;
    name: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: string;
    daysRemaining: number;
    status: 'EXPIRED' | 'EXPIRING_SOON';
  }[];
};

export const vehicleStatsService = {
  async get(actor: Actor): Promise<VehicleStats> {
    const schoolId = resolveSchoolScope(actor);
    const scope = schoolId ? { schoolId } : {};

    const today = startOfUtcDay(new Date());
    const windowEnd = new Date(today.getTime() + 30 * DAY_MS);

    const [
      totalVehicles,
      activeVehicles,
      vehiclesInMaintenance,
      inactiveVehicles,
      busCount,
      vanCount,
      totalDrivers,
      totalRoutes,
      licensesExpiringIn30Days,
      routes,
      expiringDrivers,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { ...scope } }),
      prisma.vehicle.count({ where: { ...scope, status: 'ACTIVE' } }),
      prisma.vehicle.count({ where: { ...scope, status: 'MAINTENANCE' } }),
      prisma.vehicle.count({ where: { ...scope, status: 'INACTIVE' } }),
      prisma.vehicle.count({ where: { ...scope, type: 'BUS' } }),
      prisma.vehicle.count({ where: { ...scope, type: 'VAN' } }),
      prisma.driver.count({ where: { ...scope } }),
      prisma.transportRoute.count({ where: { ...scope } }),
      prisma.driver.count({
        where: { ...scope, licenseExpiry: { gte: today, lte: windowEnd } },
      }),
      prisma.transportRoute.findMany({
        where: { ...scope },
        select: {
          id: true,
          routeCode: true,
          code: true,
          name: true,
          vehicles: { select: { capacity: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.driver.findMany({
        where: { ...scope, licenseExpiry: { lte: windowEnd } },
        select: {
          id: true,
          driverCode: true,
          name: true,
          phone: true,
          licenseNumber: true,
          licenseExpiry: true,
        },
        orderBy: { licenseExpiry: 'asc' },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      vehiclesInMaintenance,
      totalDrivers,
      totalRoutes,
      licensesExpiringIn30Days,
      vehiclesByStatus: [
        { status: 'ACTIVE', count: activeVehicles },
        { status: 'MAINTENANCE', count: vehiclesInMaintenance },
        { status: 'INACTIVE', count: inactiveVehicles },
      ],
      vehiclesByType: [
        { type: 'BUS', count: busCount },
        { type: 'VAN', count: vanCount },
      ],
      routeCapacity: routes.map((route) => ({
        routeId: route.id,
        routeCode: route.routeCode ?? route.code,
        name: route.name,
        capacity: route.vehicles.reduce((sum, v) => sum + (v.capacity ?? 0), 0),
      })),
      expiringLicenses: expiringDrivers.map((driver) => {
        const expiry = startOfUtcDay(new Date(driver.licenseExpiry));
        const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / DAY_MS);
        return {
          driverId: driver.id,
          driverCode: driver.driverCode,
          name: driver.name,
          phone: driver.phone,
          licenseNumber: driver.licenseNumber,
          licenseExpiry: expiry.toISOString().slice(0, 10),
          daysRemaining,
          status: daysRemaining < 0 ? 'EXPIRED' : 'EXPIRING_SOON',
        };
      }),
    };
  },
};
