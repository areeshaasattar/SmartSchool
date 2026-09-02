import mongoose from 'mongoose'
import { Vehicle, IVehicle } from '../models/Vehicle.js'
import { Driver, IDriver } from '../models/Driver.js'
import { Stop, IStop } from '../models/Stop.js'
import { Route, IRoute } from '../models/Route.js'
import { TransportAssignment, ITransportAssignment } from '../models/TransportAssignment.js'
import { Student } from '../../students/models/Student.js'
import { Guardian } from '../../students/models/Guardian.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'

// ── Helpers ──────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── Vehicle CRUD ─────────────────────────────────────────────────────

export async function createVehicle(schoolId: string, data: {
  registrationNo: string
  type: 'bus' | 'van' | 'other'
  capacity: number
  status?: 'active' | 'maintenance' | 'inactive'
  gpsDeviceId?: string
}, actorId: string, actorEmail = 'system'): Promise<IVehicle> {
  const vehicle = await Vehicle.create({ schoolId, ...data })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'vehicle:create',
    entity: 'Vehicle',
    entityId: (vehicle._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(vehicle),
  })

  return vehicle
}

export async function listVehicles(schoolId: string): Promise<IVehicle[]> {
  return Vehicle.find({ schoolId }).sort({ registrationNo: 1 })
}

export async function updateVehicle(
  schoolId: string,
  vehicleId: string,
  data: Partial<{
    registrationNo: string
    type: 'bus' | 'van' | 'other'
    capacity: number
    status: 'active' | 'maintenance' | 'inactive'
    gpsDeviceId: string | null
  }>,
  actorId: string,
): Promise<IVehicle> {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, schoolId })
  if (!vehicle) throw new Error('Vehicle not found')

  const before = toPlain(vehicle)

  if (data.registrationNo !== undefined)  vehicle.registrationNo = data.registrationNo
  if (data.type !== undefined) vehicle.type = data.type
  if (data.capacity !== undefined) vehicle.capacity = data.capacity
  if (data.status !== undefined) vehicle.status = data.status
  if (data.gpsDeviceId !== undefined) vehicle.gpsDeviceId = data.gpsDeviceId

  await vehicle.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'vehicle:update',
    entity: 'Vehicle',
    entityId: vehicleId,
    before,
    after: toPlain(vehicle),
  })

  return vehicle
}

// ── Driver CRUD ──────────────────────────────────────────────────────

export async function createDriver(schoolId: string, data: {
  userId?: string
  name: string
  phone: string
  licenseNo: string
  licenseExpiry: string
  status?: 'active' | 'inactive'
}, actorId: string): Promise<IDriver> {
  // Validate license expiry
  if (new Date(data.licenseExpiry) <= new Date()) {
    throw new Error('License must not be expired')
  }

  const driver = await Driver.create({
    schoolId,
    userId: data.userId || null,
    name: data.name,
    phone: data.phone,
    licenseNo: data.licenseNo,
    licenseExpiry: new Date(data.licenseExpiry),
    status: data.status || 'active',
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'driver:create',
    entity: 'Driver',
    entityId: (driver._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(driver),
  })

  return driver
}

export async function listDrivers(schoolId: string): Promise<IDriver[]> {
  return Driver.find({ schoolId }).sort({ name: 1 })
}

export async function updateDriver(
  schoolId: string,
  driverId: string,
  data: Partial<{
    userId: string | null
    name: string
    phone: string
    licenseNo: string
    licenseExpiry: string
    status: 'active' | 'inactive'
  }>,
  actorId: string,
): Promise<IDriver> {
  const driver = await Driver.findOne({ _id: driverId, schoolId })
  if (!driver) throw new Error('Driver not found')

  const before = toPlain(driver)

  if (data.userId !== undefined) driver.userId = data.userId as unknown as mongoose.Types.ObjectId | null
  if (data.name !== undefined) driver.name = data.name
  if (data.phone !== undefined) driver.phone = data.phone
  if (data.licenseNo !== undefined) driver.licenseNo = data.licenseNo
  if (data.licenseExpiry !== undefined) {
    if (new Date(data.licenseExpiry) <= new Date()) {
      throw new Error('License must not be expired')
    }
    driver.licenseExpiry = new Date(data.licenseExpiry)
  }
  if (data.status !== undefined) driver.status = data.status

  await driver.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'driver:update',
    entity: 'Driver',
    entityId: driverId,
    before,
    after: toPlain(driver),
  })

  return driver
}

// ── Stop CRUD ────────────────────────────────────────────────────────

export async function createStop(schoolId: string, data: {
  name: string
  location: { lat: number; lng: number }
}, actorId: string): Promise<IStop> {
  const stop = await Stop.create({ schoolId, ...data, routeIds: [] })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'stop:create',
    entity: 'Stop',
    entityId: (stop._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(stop),
  })

  return stop
}

export async function listStops(schoolId: string): Promise<IStop[]> {
  return Stop.find({ schoolId }).sort({ name: 1 })
}

// ── Route CRUD (with double-booking prevention) ──────────────────────

export async function createRoute(schoolId: string, data: {
  name: string
  vehicleId: string
  driverId: string
  stops: Array<{ stopId: string; order: number; estimatedTime: string }>
}, actorId: string): Promise<IRoute> {
  // Validate stop orders are unique
  const orders = data.stops.map(s => s.order)
  if (new Set(orders).size !== orders.length) {
    throw new Error('Stop orders must be unique within a route')
  }

  // Check vehicle exists and belongs to school
  const vehicle = await Vehicle.findOne({ _id: data.vehicleId, schoolId })
  if (!vehicle) throw new Error('Vehicle not found')
  if (vehicle.status !== 'active') throw new Error('Vehicle is not active')

  // Check driver exists and belongs to school
  const driver = await Driver.findOne({ _id: data.driverId, schoolId })
  if (!driver) throw new Error('Driver not found')
  if (driver.status !== 'active') throw new Error('Driver is not active')

  // Check for vehicle double-booking (existing active routes using this vehicle)
  const existingVehicleRoute = await Route.findOne({
    schoolId,
    vehicleId: data.vehicleId,
    _id: { $ne: null }, // any route
  })
  if (existingVehicleRoute) {
    throw new Error(`Vehicle is already assigned to route "${existingVehicleRoute.name}"`)
  }

  // Check for driver double-booking
  const existingDriverRoute = await Route.findOne({
    schoolId,
    driverId: data.driverId,
    _id: { $ne: null },
  })
  if (existingDriverRoute) {
    throw new Error(`Driver is already assigned to route "${existingDriverRoute.name}"`)
  }

  // Validate stops exist
  const stopIds = data.stops.map(s => s.stopId)
  const stops = await Stop.find({ _id: { $in: stopIds }, schoolId })
  if (stops.length !== stopIds.length) {
    throw new Error('One or more stops not found')
  }

  const route = await Route.create({
    schoolId,
    name: data.name,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    stops: data.stops.map(s => ({
      stopId: new mongoose.Types.ObjectId(s.stopId),
      order: s.order,
      estimatedTime: s.estimatedTime,
    })),
  })

  // Add route to stops' routeIds
  await Stop.updateMany(
    { _id: { $in: stopIds } },
    { $addToSet: { routeIds: route._id } },
  )

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'route:create',
    entity: 'Route',
    entityId: (route._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(route),
  })

  return route
}

export async function updateRoute(
  schoolId: string,
  routeId: string,
  data: Partial<{
    name: string
    vehicleId: string
    driverId: string
    stops: Array<{ stopId: string; order: number; estimatedTime: string }>
  }>,
  actorId: string,
): Promise<IRoute> {
  const route = await Route.findOne({ _id: routeId, schoolId })
  if (!route) throw new Error('Route not found')

  const before = toPlain(route)

  // If changing vehicle, check double-booking
  if (data.vehicleId && data.vehicleId !== route.vehicleId.toString()) {
    const existingRoute = await Route.findOne({
      schoolId,
      vehicleId: data.vehicleId,
      _id: { $ne: routeId },
    })
    if (existingRoute) {
      throw new Error(`Vehicle is already assigned to route "${existingRoute.name}"`)
    }
  }

  // If changing driver, check double-booking
  if (data.driverId && data.driverId !== route.driverId.toString()) {
    const existingRoute = await Route.findOne({
      schoolId,
      driverId: data.driverId,
      _id: { $ne: routeId },
    })
    if (existingRoute) {
      throw new Error(`Driver is already assigned to route "${existingRoute.name}"`)
    }
  }

  // Validate stop orders unique
  if (data.stops) {
    const orders = data.stops.map(s => s.order)
    if (new Set(orders).size !== orders.length) {
      throw new Error('Stop orders must be unique within a route')
    }

    // Validate stops exist
    const stopIds = data.stops.map(s => s.stopId)
    const stops = await Stop.find({ _id: { $in: stopIds }, schoolId })
    if (stops.length !== stopIds.length) {
      throw new Error('One or more stops not found')
    }

    // Remove route from old stops
    await Stop.updateMany(
      { routeIds: routeId },
      { $pull: { routeIds: routeId } },
    )

    // Add route to new stops
    await Stop.updateMany(
      { _id: { $in: stopIds } },
      { $addToSet: { routeIds: routeId } },
    )
  }

  if (data.name !== undefined) route.name = data.name
  if (data.vehicleId !== undefined) route.vehicleId = new mongoose.Types.ObjectId(data.vehicleId)
  if (data.driverId !== undefined) route.driverId = new mongoose.Types.ObjectId(data.driverId)
  if (data.stops !== undefined) {
    route.stops = data.stops.map(s => ({
      stopId: new mongoose.Types.ObjectId(s.stopId),
      order: s.order,
      estimatedTime: s.estimatedTime,
    })) as unknown as mongoose.Types.DocumentArray<{ stopId: mongoose.Types.ObjectId; order: number; estimatedTime: string }>
  }

  await route.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'route:update',
    entity: 'Route',
    entityId: routeId,
    before,
    after: toPlain(route),
  })

  return route
}

export async function listRoutes(schoolId: string): Promise<IRoute[]> {
  return Route.find({ schoolId })
    .populate('vehicleId', 'registrationNo type capacity')
    .populate('driverId', 'name phone')
    .sort({ name: 1 })
}

export async function getRouteById(schoolId: string, routeId: string) {
  const route = await Route.findOne({ _id: routeId, schoolId })
    .populate('vehicleId', 'registrationNo type capacity status')
    .populate('driverId', 'name phone licenseNo status')
    .populate('stops.stopId', 'name location')

  if (!route) return null

  // Get assigned students count
  const studentCount = await TransportAssignment.countDocuments({
    schoolId,
    routeId,
    status: 'active',
  })

  return { route, studentCount }
}

// ── Transport Assignment ─────────────────────────────────────────────

export async function createTransportAssignment(schoolId: string, data: {
  studentId: string
  routeId: string
  stopId: string
  academicYearId: string
}, actorId: string): Promise<ITransportAssignment> {
  // Validate student belongs to school
  const student = await Student.findOne({ _id: data.studentId, schoolId })
  if (!student) throw new Error('Student not found in this school')

  // Validate route
  const route = await Route.findOne({ _id: data.routeId, schoolId })
  if (!route) throw new Error('Route not found')

  // Validate stop belongs to this route
  const stopInRoute = route.stops.some(s => s.stopId.toString() === data.stopId)
  if (!stopInRoute) throw new Error('Stop is not part of this route')

  // Check for existing active assignment for this student in this academic year
  const existing = await TransportAssignment.findOne({
    schoolId,
    studentId: data.studentId,
    academicYearId: data.academicYearId,
    status: 'active',
  })
  if (existing) {
    throw new Error('Student already has an active transport assignment for this academic year')
  }

  const assignment = await TransportAssignment.create({
    schoolId,
    studentId: data.studentId,
    routeId: data.routeId,
    stopId: data.stopId,
    academicYearId: data.academicYearId,
    status: 'active',
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'transport:assign',
    entity: 'TransportAssignment',
    entityId: (assignment._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(assignment),
  })

  return assignment
}

export async function deleteTransportAssignment(
  schoolId: string,
  assignmentId: string,
  actorId: string,
): Promise<void> {
  const assignment = await TransportAssignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Transport assignment not found')

  const before = toPlain(assignment)

  await TransportAssignment.deleteOne({ _id: assignmentId })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail: 'system',
    action: 'transport:unassign',
    entity: 'TransportAssignment',
    entityId: assignmentId,
    before,
  })
}

export async function getStudentTransport(
  schoolId: string,
  studentId: string,
  userId: string,
  roles: string[],
) {
  // Role-filtered: parent sees own child only
  if (roles.includes('parent')) {
    const guardians = await Guardian.find({ userId, schoolId }).select('children')
    const childIds = guardians.flatMap(g => g.children.map(c => c.toString()))
    if (!childIds.includes(studentId)) {
      throw new Error('Access denied: not your child')
    }
  }

  const assignment = await TransportAssignment.findOne({
    schoolId,
    studentId,
    status: 'active',
  })
    .populate({
      path: 'routeId',
      populate: [
        { path: 'vehicleId', select: 'registrationNo type capacity' },
        { path: 'driverId', select: 'name phone' },
      ],
    })
    .populate('stopId', 'name location')

  return assignment
}

// ── Transport Fee Component Helper ───────────────────────────────────

/**
 * Get a transport fee component for a student's active assignment.
 * This is loosely coupled — fee-invoice generation can optionally call this.
 *
 * @returns A fee component object { label, amount } or null if student has no transport assignment
 */
export async function getTransportFeeComponent(
  studentId: string,
  schoolId: string,
  academicYearId: string,
): Promise<{ label: string; amount: number } | null> {
  const assignment = await TransportAssignment.findOne({
    schoolId,
    studentId,
    academicYearId,
    status: 'active',
  }).populate('routeId', 'name')

  if (!assignment) return null

  const route = assignment.routeId as unknown as { name: string }

  // For now, return a placeholder label — actual transport fee amounts
  // would come from school settings or a transport fee config in a future iteration
  return {
    label: `Transport — ${route.name}`,
    amount: 0, // Placeholder — school admin would configure this per route
  }
}
