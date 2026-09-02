import mongoose from 'mongoose'
import { TimetableSlot } from '../../src/modules/timetables/models/TimetableSlot.js'
import * as timetableService from '../../src/modules/timetables/services/timetableService.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId, email: 'admin@test.com', roles: ['school_admin'], schoolIds: [schoolId] }
    req.tenantId = schoolId
    next()
  }),
}))

jest.mock('../../src/middlewares/tenant/resolveTenant.js', () => ({
  resolveTenant: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

jest.mock('../../src/middlewares/permissions/requireRole.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/middlewares/validation/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

// Spy on model methods
jest.spyOn(TimetableSlot, 'find')
jest.spyOn(TimetableSlot, 'create')
jest.spyOn(TimetableSlot, 'findByIdAndDelete')

// ── Tests ────────────────────────────────────────────────────────────

describe('Timetable Conflict Detection', () => {
  const academicYearId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkConflicts — teacher double-booking', () => {
    it('detects teacher conflict when same teacher is assigned at overlapping time', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: null,
          day: 'monday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'monday', '09:30', '10:30',
        teacherId, classId2, null,
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflictType).toBe('teacher')
    })

    it('allows same teacher at non-overlapping times', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: null,
          day: 'monday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ])

      // 10:00-11:00 — back-to-back, no overlap
      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'monday', '10:00', '11:00',
        teacherId, classId2, null,
      )

      expect(result.hasConflict).toBe(false)
    })
  })

  describe('checkConflicts — room double-booking', () => {
    it('detects room conflict when same room is booked at overlapping time', async () => {
      const roomId = new mongoose.Types.ObjectId().toString()
      const teacherId1 = new mongoose.Types.ObjectId().toString()
      const teacherId2 = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId1),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: new mongoose.Types.ObjectId(roomId),
          day: 'tuesday',
          startTime: '11:00',
          endTime: '12:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'tuesday', '11:30', '12:30',
        teacherId2, classId2, roomId,
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflictType).toBe('room')
    })

    it('allows same room at non-overlapping times', async () => {
      const roomId = new mongoose.Types.ObjectId().toString()
      const teacherId1 = new mongoose.Types.ObjectId().toString()
      const teacherId2 = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId1),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: new mongoose.Types.ObjectId(roomId),
          day: 'tuesday',
          startTime: '11:00',
          endTime: '12:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'tuesday', '12:00', '13:00',
        teacherId2, classId2, roomId,
      )

      expect(result.hasConflict).toBe(false)
    })
  })

  describe('checkConflicts — class double-booking', () => {
    it('detects class conflict when same class has overlapping subject', async () => {
      const classId = new mongoose.Types.ObjectId().toString()
      const teacherId1 = new mongoose.Types.ObjectId().toString()
      const teacherId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId1),
          classId: new mongoose.Types.ObjectId(classId),
          roomId: null,
          day: 'wednesday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'wednesday', '09:30', '10:30',
        teacherId2, classId, null,
      )

      expect(result.hasConflict).toBe(true)
      expect(result.conflictType).toBe('class')
    })

    it('allows same class at non-overlapping times', async () => {
      const classId = new mongoose.Types.ObjectId().toString()
      const teacherId1 = new mongoose.Types.ObjectId().toString()
      const teacherId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId1),
          classId: new mongoose.Types.ObjectId(classId),
          roomId: null,
          day: 'wednesday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'wednesday', '10:00', '11:00',
        teacherId2, classId, null,
      )

      expect(result.hasConflict).toBe(false)
    })
  })

  describe('checkConflicts — boundary edge cases', () => {
    it('allows exact boundary (end of one = start of next)', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: null,
          day: 'thursday',
          startTime: '08:00',
          endTime: '09:00',
        },
      ])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'thursday', '09:00', '10:00',
        teacherId, classId2, null,
      )

      expect(result.hasConflict).toBe(false)
    })

    it('detects overlap of 1 minute', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString()
      const classId1 = new mongoose.Types.ObjectId().toString()
      const classId2 = new mongoose.Types.ObjectId().toString()

      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          teacherId: new mongoose.Types.ObjectId(teacherId),
          classId: new mongoose.Types.ObjectId(classId1),
          roomId: null,
          day: 'friday',
          startTime: '09:00',
          endTime: '10:00',
        },
      ])

      // Starts 1 minute before existing ends
      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'friday', '09:59', '10:59',
        teacherId, classId2, null,
      )

      expect(result.hasConflict).toBe(true)
    })
  })

  describe('checkConflicts — excludes self on update', () => {
    it('does not conflict with itself when updating', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString()
      const classId = new mongoose.Types.ObjectId().toString()
      const slotId = new mongoose.Types.ObjectId().toString()

      // Find should exclude this slot
      ;(TimetableSlot.find as jest.Mock).mockResolvedValue([])

      const result = await timetableService.checkConflicts(
        schoolId, academicYearId, 'monday', '09:00', '10:00',
        teacherId, classId, null,
        slotId.toString(),
      )

      expect(result.hasConflict).toBe(false)
      // Verify the exclude filter was applied
      const findCall = (TimetableSlot.find as jest.Mock).mock.calls[0][0]
      expect(findCall._id).toBeDefined()
    })
  })
})
