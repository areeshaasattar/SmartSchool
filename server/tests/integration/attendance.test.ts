import mongoose from 'mongoose'
import { Attendance } from '../../src/modules/attendance/models/Attendance.js'
import { Class } from '../../src/modules/classes/models/Class.js'
import { Student } from '../../src/modules/students/models/Student.js'
import { School } from '../../src/modules/schools/models/School.js'
import { Teacher } from '../../src/modules/teachers/models/Teacher.js'
import * as attendanceService from '../../src/modules/attendance/services/attendanceService.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId, email: 'teacher@test.com', roles: ['teacher'], schoolIds: [schoolId] }
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

jest.mock('../../src/modules/notifications/services/notificationService.js', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/modules/students/models/Guardian.js', () => ({
  Guardian: {
    find: jest.fn().mockResolvedValue([]),
  },
}))

// ── Spy on model methods
jest.spyOn(Class, 'findOne')
jest.spyOn(Student, 'findOne')
jest.spyOn(School, 'findById')
jest.spyOn(Teacher, 'findOne')
jest.spyOn(Attendance, 'find')
jest.spyOn(Attendance, 'findOneAndUpdate')
jest.spyOn(Attendance, 'aggregate')

// ── Tests ────────────────────────────────────────────────────────────

describe('Attendance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isTeacherAssignedToClass', () => {
    it('returns true when teacher is classTeacherId', async () => {
      const teacherId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(Class.findOne as jest.Mock).mockResolvedValue({
        _id: classId,
        classTeacherId: teacherId,
        teacherIds: [],
      })

      const result = await attendanceService.isTeacherAssignedToClass(teacherId.toString(), classId.toString(), schoolId)
      expect(result).toBe(true)
    })

    it('returns true when teacher is in teacherIds', async () => {
      const teacherId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(Class.findOne as jest.Mock).mockResolvedValue({
        _id: classId,
        classTeacherId: null,
        teacherIds: [teacherId],
      })

      const result = await attendanceService.isTeacherAssignedToClass(teacherId.toString(), classId.toString(), schoolId)
      expect(result).toBe(true)
    })

    it('returns false when teacher is not assigned', async () => {
      const teacherId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(Class.findOne as jest.Mock).mockResolvedValue({
        _id: classId,
        classTeacherId: new mongoose.Types.ObjectId(),
        teacherIds: [new mongoose.Types.ObjectId()],
      })

      const result = await attendanceService.isTeacherAssignedToClass(teacherId.toString(), classId.toString(), schoolId)
      expect(result).toBe(false)
    })

    it('returns false when class not found', async () => {
      ;(Class.findOne as jest.Mock).mockResolvedValue(null)
      const result = await attendanceService.isTeacherAssignedToClass(userId, new mongoose.Types.ObjectId().toString(), schoolId)
      expect(result).toBe(false)
    })
  })

  describe('checkAttendanceThreshold', () => {
    it('triggers alert when attendance is below threshold', async () => {
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      // Mock school with 75% threshold
      ;(School.findById as jest.Mock).mockResolvedValue({
        settings: { attendanceAlertThreshold: 75 },
      })

      // Mock attendance records: 3 present, 7 absent in last 30 days
      const records = Array.from({ length: 10 }, (_, i) => ({
        status: i < 3 ? 'present' : 'absent',
      }))
      ;(Attendance.find as jest.Mock).mockResolvedValue(records)

      const alert = await attendanceService.checkAttendanceThreshold(schoolId, studentId.toString(), classId.toString())
      expect(alert).not.toBeNull()
      expect(alert!.attendancePercentage).toBe(30)
      expect(alert!.threshold).toBe(75)
    })

    it('does not trigger when attendance is above threshold', async () => {
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(School.findById as jest.Mock).mockResolvedValue({
        settings: { attendanceAlertThreshold: 75 },
      })

      // 9 present, 1 absent
      const records = Array.from({ length: 10 }, (_, i) => ({
        status: i < 9 ? 'present' : 'absent',
      }))
      ;(Attendance.find as jest.Mock).mockResolvedValue(records)

      const alert = await attendanceService.checkAttendanceThreshold(schoolId, studentId.toString(), classId.toString())
      expect(alert).toBeNull()
    })

    it('returns null when no records exist', async () => {
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(School.findById as jest.Mock).mockResolvedValue({
        settings: { attendanceAlertThreshold: 75 },
      })
      ;(Attendance.find as jest.Mock).mockResolvedValue([])

      const alert = await attendanceService.checkAttendanceThreshold(schoolId, studentId.toString(), classId.toString())
      expect(alert).toBeNull()
    })

    it('uses default threshold of 75% when school settings not found', async () => {
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(School.findById as jest.Mock).mockResolvedValue(null)

      // 5 present, 5 absent = 50%
      const records = Array.from({ length: 10 }, (_, i) => ({
        status: i < 5 ? 'present' : 'absent',
      }))
      ;(Attendance.find as jest.Mock).mockResolvedValue(records)

      const alert = await attendanceService.checkAttendanceThreshold(schoolId, studentId.toString(), classId.toString())
      expect(alert).not.toBeNull()
      expect(alert!.threshold).toBe(75)
    })

    it('counts late and excused as present-equivalent', async () => {
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      ;(School.findById as jest.Mock).mockResolvedValue({
        settings: { attendanceAlertThreshold: 75 },
      })

      // 5 present, 3 late, 2 excused = 100%
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
        { status: 'late' },
        { status: 'late' },
        { status: 'late' },
        { status: 'excused' },
        { status: 'excused' },
      ]
      ;(Attendance.find as jest.Mock).mockResolvedValue(records)

      const alert = await attendanceService.checkAttendanceThreshold(schoolId, studentId.toString(), classId.toString())
      expect(alert).toBeNull()
    })
  })

  describe('markAttendance', () => {
    it('rejects future dates', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      ;(Class.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        academicYearId: new mongoose.Types.ObjectId(),
      })

      await expect(
        attendanceService.markAttendance(schoolId, {
          classId: new mongoose.Types.ObjectId().toString(),
          date: futureDate.toISOString().split('T')[0],
          records: [{ studentId: 'student1', status: 'present' }],
        }, userId),
      ).rejects.toThrow('future date')
    })

    it('upserts when marking same day twice', async () => {
      const classId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()
      const teacherId = new mongoose.Types.ObjectId()

      ;(Class.findOne as jest.Mock).mockResolvedValue({
        _id: classId,
        academicYearId: new mongoose.Types.ObjectId(),
      })
      ;(Teacher.findOne as jest.Mock).mockResolvedValue({ _id: teacherId })
      ;(Student.findOne as jest.Mock).mockResolvedValue({
        _id: studentId,
        schoolId,
        classId,
      })
      ;(School.findById as jest.Mock).mockResolvedValue({
        settings: { attendanceAlertThreshold: 75 },
      })
      ;(Attendance.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'absent',
      })
      ;(Attendance.find as jest.Mock).mockResolvedValue([])

      const today = new Date().toISOString().split('T')[0]
      const result = await attendanceService.markAttendance(schoolId, {
        classId: classId.toString(),
        date: today,
        records: [{ studentId: studentId.toString(), status: 'absent' }],
      }, userId)

      expect(result.records).toHaveLength(1)
      expect(Attendance.findOneAndUpdate).toHaveBeenCalled()
    })
  })

  describe('getAttendanceSummary', () => {
    it('returns correct summary with counts and percentage', async () => {
      const classId = new mongoose.Types.ObjectId()

      ;(Attendance.aggregate as jest.Mock).mockResolvedValue([
        { _id: 'present', count: 80 },
        { _id: 'absent', count: 10 },
        { _id: 'late', count: 5 },
        { _id: 'excused', count: 3 },
        { _id: 'half_day', count: 2 },
      ])

      const result = await attendanceService.getAttendanceSummary(schoolId, {
        classId: classId.toString(),
      })

      expect(result.totalRecords).toBe(100)
      // present(80) + late(5) + excused(3) = 88
      expect(result.percentage).toBe(88)
      expect(result.summary.present).toBe(80)
      expect(result.summary.absent).toBe(10)
    })

    it('returns 0 percentage when no records', async () => {
      ;(Attendance.aggregate as jest.Mock).mockResolvedValue([])

      const result = await attendanceService.getAttendanceSummary(schoolId, {})
      expect(result.totalRecords).toBe(0)
      expect(result.percentage).toBe(0)
    })
  })
})
