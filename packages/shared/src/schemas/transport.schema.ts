import { z } from 'zod';
import { VehicleStatus, TransportStatus } from '@prisma/client';

export const createVehicleSchema = z.object({
  schoolId: z.string().cuid().optional(),
  plateNumber: z.string().trim().min(1).max(20),
  model: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().int().min(1),
  driverName: z.string().trim().max(100).optional(),
  driverPhone: z.string().trim().max(30).optional(),
  insuranceExpiry: z.coerce.date().optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z
  .object({
    model: z.string().trim().max(50).optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional(),
    driverName: z.string().trim().max(100).optional().nullable(),
    driverPhone: z.string().trim().max(30).optional().nullable(),
    status: z.nativeEnum(VehicleStatus).optional(),
    insuranceExpiry: z.coerce.date().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(VehicleStatus).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;

export const createTransportRouteSchema = z.object({
  schoolId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(1).max(30),
  description: z.string().trim().max(255).optional(),
  fare: z.coerce.number().min(0).default(0),
  vehicleId: z.string().cuid().optional(),
});
export type CreateTransportRouteInput = z.infer<typeof createTransportRouteSchema>;

export const updateTransportRouteSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(255).optional().nullable(),
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
