import { z } from 'zod';
import { VehicleStatus, VehicleType, TransportStatus } from '@prisma/client';

export const createVehicleSchema = z.object({
  schoolId: z.string().cuid().optional(),
  vehicleCode: z.string().trim().min(1).max(30).optional(),
  plateNumber: z.string().trim().min(1).max(20),
  model: z.string().trim().max(50).optional(),
  type: z.nativeEnum(VehicleType).default('BUS'),
  capacity: z.coerce.number().int().min(1),
  driverName: z.string().trim().max(100).optional(),
  driverPhone: z.string().trim().max(30).optional(),
  driverId: z.string().cuid().optional().nullable(),
  routeId: z.string().cuid().optional().nullable(),
  insuranceExpiry: z.coerce.date().optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z
  .object({
    vehicleCode: z.string().trim().min(1).max(30).optional(),
    plateNumber: z.string().trim().min(1).max(20).optional(),
    model: z.string().trim().max(50).optional().nullable(),
    type: z.nativeEnum(VehicleType).optional(),
    capacity: z.coerce.number().int().min(1).optional(),
    driverName: z.string().trim().max(100).optional().nullable(),
    driverPhone: z.string().trim().max(30).optional().nullable(),
    driverId: z.string().cuid().optional().nullable(),
    routeId: z.string().cuid().optional().nullable(),
    status: z.nativeEnum(VehicleStatus).optional(),
    insuranceExpiry: z.coerce.date().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(VehicleStatus).optional(),
  type: z.nativeEnum(VehicleType).optional(),
  routeId: z.string().cuid().optional(),
  driverId: z.string().cuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;

const stopsInputSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const list = Array.isArray(value) ? value : value.split(',');
    return list.map((s) => s.trim()).filter((s) => s.length > 0);
  });

export const createTransportRouteSchema = z.object({
  schoolId: z.string().cuid().optional(),
  routeCode: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30).optional(),
  description: z.string().trim().max(255).optional(),
  startPoint: z.string().trim().max(120).optional(),
  endPoint: z.string().trim().max(120).optional(),
  stops: stopsInputSchema,
  pickupTime: z.string().trim().max(20).optional(),
  dropTime: z.string().trim().max(20).optional(),
  fare: z.coerce.number().min(0).default(0),
  vehicleId: z.string().cuid().optional(),
});
export type CreateTransportRouteInput = z.infer<typeof createTransportRouteSchema>;

export const updateTransportRouteSchema = z
  .object({
    routeCode: z.string().trim().min(1).max(30).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(30).optional(),
    description: z.string().trim().max(255).optional().nullable(),
    startPoint: z.string().trim().max(120).optional().nullable(),
    endPoint: z.string().trim().max(120).optional().nullable(),
    stops: stopsInputSchema,
    pickupTime: z.string().trim().max(20).optional().nullable(),
    dropTime: z.string().trim().max(20).optional().nullable(),
    fare: z.coerce.number().min(0).optional(),
    vehicleId: z.string().cuid().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateTransportRouteInput = z.infer<typeof updateTransportRouteSchema>;

export const listTransportRoutesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListTransportRoutesQuery = z.infer<typeof listTransportRoutesQuerySchema>;

export const createDriverSchema = z.object({
  schoolId: z.string().cuid().optional(),
  driverCode: z.string().trim().min(1).max(30).optional(),
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid phone number'),
  licenseNumber: z.string().trim().min(1).max(40),
  licenseExpiry: z.coerce.date(),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = z
  .object({
    driverCode: z.string().trim().min(1).max(30).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[+]?[\d\s()-]{7,20}$/, 'Invalid phone number')
      .optional(),
    licenseNumber: z.string().trim().min(1).max(40).optional(),
    licenseExpiry: z.coerce.date().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

export const listDriversQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;

export const createRouteStopSchema = z.object({
  routeId: z.string().cuid(),
  name: z.string().trim().min(1).max(100),
  sequence: z.coerce.number().int().min(1),
  pickupTime: z.string().trim().max(20).optional(),
  dropTime: z.string().trim().max(20).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});
export type CreateRouteStopInput = z.infer<typeof createRouteStopSchema>;

export const updateRouteStopSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    sequence: z.coerce.number().int().min(1).optional(),
    pickupTime: z.string().trim().max(20).optional().nullable(),
    dropTime: z.string().trim().max(20).optional().nullable(),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateRouteStopInput = z.infer<typeof updateRouteStopSchema>;

export const listRouteStopsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  routeId: z.string().cuid().optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListRouteStopsQuery = z.infer<typeof listRouteStopsQuerySchema>;

export const createTransportSubscriptionSchema = z.object({
  studentId: z.string().cuid(),
  routeId: z.string().cuid(),
  stopId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(TransportStatus).default('ACTIVE'),
});
export type CreateTransportSubscriptionInput = z.infer<typeof createTransportSubscriptionSchema>;

export const updateTransportSubscriptionSchema = z
  .object({
    stopId: z.string().cuid().optional().nullable(),
    endDate: z.coerce.date().optional().nullable(),
    status: z.nativeEnum(TransportStatus).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateTransportSubscriptionInput = z.infer<typeof updateTransportSubscriptionSchema>;

export const listTransportSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.string().cuid().optional(),
  routeId: z.string().cuid().optional(),
  status: z.nativeEnum(TransportStatus).optional(),
});
export type ListTransportSubscriptionsQuery = z.infer<typeof listTransportSubscriptionsQuerySchema>;
