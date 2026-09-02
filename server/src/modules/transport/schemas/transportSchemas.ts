import { z } from 'zod'

// ── Vehicle ──────────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  registrationNo: z.string().min(1, 'Registration number is required'),
  type: z.enum(['bus', 'van', 'other']),
  capacity: z.number().int().positive('Capacity must be at least 1'),
  status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
  gpsDeviceId: z.string().optional(),
})

export const updateVehicleSchema = z.object({
  registrationNo: z.string().min(1).optional(),
  type: z.enum(['bus', 'van', 'other']).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  gpsDeviceId: z.string().nullable().optional(),
})

// ── Driver ───────────────────────────────────────────────────────────

export const createDriverSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, 'Driver name is required'),
  phone: z.string().min(1, 'Phone is required'),
  licenseNo: z.string().min(1, 'License number is required'),
  licenseExpiry: z.string().min(1, 'License expiry is required'),
  status: z.enum(['active', 'inactive']).default('active'),
}).refine(
  (data) => new Date(data.licenseExpiry) > new Date(),
  { message: 'License must not be expired', path: ['licenseExpiry'] },
)

export const updateDriverSchema = z.object({
  userId: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  licenseNo: z.string().min(1).optional(),
  licenseExpiry: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

// ── Stop ─────────────────────────────────────────────────────────────

export const createStopSchema = z.object({
  name: z.string().min(1, 'Stop name is required'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
})

// ── Route ────────────────────────────────────────────────────────────

const routeStopSchema = z.object({
  stopId: z.string().min(1),
  order: z.number().int().positive(),
  estimatedTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm format'),
})

export const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  stops: z.array(routeStopSchema).min(2, 'A route must have at least 2 stops'),
}).refine(
  (data) => {
    const orders = data.stops.map(s => s.order)
    return new Set(orders).size === orders.length
  },
  { message: 'Stop orders must be unique within a route', path: ['stops'] },
)

export const updateRouteSchema = z.object({
  name: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
  driverId: z.string().min(1).optional(),
  stops: z.array(routeStopSchema).min(2).optional(),
}).refine(
  (data) => {
    if (!data.stops) return true
    const orders = data.stops.map(s => s.order)
    return new Set(orders).size === orders.length
  },
  { message: 'Stop orders must be unique within a route', path: ['stops'] },
)

// ── Transport Assignment ─────────────────────────────────────────────

export const createTransportAssignmentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  routeId: z.string().min(1, 'Route ID is required'),
  stopId: z.string().min(1, 'Stop ID is required'),
  academicYearId: z.string().min(1, 'Academic year is required'),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>
export type CreateDriverInput = z.infer<typeof createDriverSchema>
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>
export type CreateStopInput = z.infer<typeof createStopSchema>
export type CreateRouteInput = z.infer<typeof createRouteSchema>
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>
export type CreateTransportAssignmentInput = z.infer<typeof createTransportAssignmentSchema>
