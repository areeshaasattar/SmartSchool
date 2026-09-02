import mongoose from 'mongoose'

// ── Shared mock data ─────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId1 = new mongoose.Types.ObjectId().toString()
const studentId = new mongoose.Types.ObjectId().toString()
const mockVehicleId = new mongoose.Types.ObjectId().toString()
const mockDriverId = new mongoose.Types.ObjectId().toString()
const mockStopId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/modules/students/models/Student.js', () => ({
  Student: {
    findOne: jest.fn().mockResolvedValue({
      _id: studentId,
      schoolId,
      guardianIds: [],
    }),
  },
}))

jest.mock('../../src/modules/students/models/Guardian.js', () => ({
  Guardian: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    }),
  },
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  AuditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/modules/transport/models/Vehicle.js', () => ({
  Vehicle: {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data, save: jest.fn() })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('../../src/modules/transport/models/Driver.js', () => ({
  Driver: {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data, save: jest.fn() })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('../../src/modules/transport/models/Stop.js', () => ({
  Stop: {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data, save: jest.fn() })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('../../src/modules/transport/models/Route.js', () => ({
  Route: {
    create: jest.fn().mockImplementation((data) => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      ...data,
      save: jest.fn(),
    })),
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}))

jest.mock('../../src/modules/transport/models/TransportAssignment.js', () => ({
  TransportAssignment: {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...data, save: jest.fn() })),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
    deleteOne: jest.fn().mockResolvedValue({}),
  },
}))

// ── Imports after mocks ──────────────────────────────────────────────

import { Vehicle } from '../../src/modules/transport/models/Vehicle.js'
import { Driver } from '../../src/modules/transport/models/Driver.js'
import { Route } from '../../src/modules/transport/models/Route.js'
import { TransportAssignment } from '../../src/modules/transport/models/TransportAssignment.js'
import * as transportService from '../../src/modules/transport/services/transportService.js'

// ── Tests ────────────────────────────────────────────────────────────

describe('Transport Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createVehicle', () => {
    it('should create a vehicle', async () => {
      const result = await transportService.createVehicle(schoolId, {
        registrationNo: 'KA-01-AB-1234',
        type: 'bus',
        capacity: 40,
      }, userId1)

      expect(result).toBeDefined()
      expect(Vehicle.create).toHaveBeenCalled()
    })
  })

  describe('createDriver', () => {
    it('should create a driver with valid license', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 2)

      const result = await transportService.createDriver(schoolId, {
        name: 'John Driver',
        phone: '9876543210',
        licenseNo: 'DL-1234567890',
        licenseExpiry: futureDate.toISOString().split('T')[0],
      }, userId1)

      expect(result).toBeDefined()
      expect(Driver.create).toHaveBeenCalled()
    })

    it('should reject expired license', async () => {
      await expect(
        transportService.createDriver(schoolId, {
          name: 'John Driver',
          phone: '9876543210',
          licenseNo: 'DL-1234567890',
          licenseExpiry: '2020-01-01',
        }, userId1),
      ).rejects.toThrow('License must not be expired')
    })
  })

  describe('createRoute with double-booking prevention', () => {
    it('should reject duplicate stop orders', async () => {
      ;(Vehicle.findOne as jest.Mock).mockResolvedValue({
        _id: mockVehicleId, status: 'active',
      })
      ;(Driver.findOne as jest.Mock).mockResolvedValue({
        _id: mockDriverId, status: 'active',
      })
      ;(Route.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        transportService.createRoute(schoolId, {
          name: 'Route B',
          vehicleId: mockVehicleId,
          driverId: mockDriverId,
          stops: [
            { stopId: mockStopId, order: 1, estimatedTime: '07:00' },
            { stopId: mockStopId, order: 1, estimatedTime: '07:30' },
          ],
        }, userId1),
      ).rejects.toThrow('Stop orders must be unique within a route')
    })

    it('should reject vehicle already assigned to another route', async () => {
      ;(Vehicle.findOne as jest.Mock).mockResolvedValue({
        _id: mockVehicleId, status: 'active',
      })
      ;(Driver.findOne as jest.Mock).mockResolvedValue({
        _id: mockDriverId, status: 'active',
      })
      ;(Route.findOne as jest.Mock).mockResolvedValue({ name: 'Existing Route' })

      await expect(
        transportService.createRoute(schoolId, {
          name: 'Route B',
          vehicleId: mockVehicleId,
          driverId: mockDriverId,
          stops: [
            { stopId: mockStopId, order: 1, estimatedTime: '07:00' },
            { stopId: mockStopId, order: 2, estimatedTime: '07:30' },
          ],
        }, userId1),
      ).rejects.toThrow('Vehicle is already assigned to route')
    })

    it('should reject driver already assigned to another route', async () => {
      ;(Vehicle.findOne as jest.Mock).mockResolvedValue({
        _id: mockVehicleId, status: 'active',
      })
      ;(Driver.findOne as jest.Mock).mockResolvedValue({
        _id: mockDriverId, status: 'active',
      })
      ;(Route.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // vehicle check passes
        .mockResolvedValueOnce({ name: 'Existing Route' }) // driver check fails

      await expect(
        transportService.createRoute(schoolId, {
          name: 'Route B',
          vehicleId: mockVehicleId,
          driverId: mockDriverId,
          stops: [
            { stopId: mockStopId, order: 1, estimatedTime: '07:00' },
            { stopId: mockStopId, order: 2, estimatedTime: '07:30' },
          ],
        }, userId1),
      ).rejects.toThrow('Driver is already assigned to route')
    })

    it('should reject inactive vehicle', async () => {
      ;(Vehicle.findOne as jest.Mock).mockResolvedValue({
        _id: mockVehicleId, status: 'maintenance',
      })

      await expect(
        transportService.createRoute(schoolId, {
          name: 'Route B',
          vehicleId: mockVehicleId,
          driverId: mockDriverId,
          stops: [
            { stopId: mockStopId, order: 1, estimatedTime: '07:00' },
            { stopId: mockStopId, order: 2, estimatedTime: '07:30' },
          ],
        }, userId1),
      ).rejects.toThrow('Vehicle is not active')
    })
  })

  describe('createTransportAssignment', () => {
    it('should reject duplicate active assignment', async () => {
      // Route must exist and contain the stop
      ;(Route.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        stops: [{ stopId: { toString: () => mockStopId } }],
      })
      ;(TransportAssignment.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' })

      await expect(
        transportService.createTransportAssignment(schoolId, {
          studentId,
          routeId: new mongoose.Types.ObjectId().toString(),
          stopId: mockStopId,
          academicYearId: new mongoose.Types.ObjectId().toString(),
        }, userId1),
      ).rejects.toThrow('Student already has an active transport assignment')
    })
  })
})
