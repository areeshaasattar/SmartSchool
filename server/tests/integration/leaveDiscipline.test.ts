import mongoose from 'mongoose'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId1 = new mongoose.Types.ObjectId().toString()
const studentId = new mongoose.Types.ObjectId().toString()
const teacherId = new mongoose.Types.ObjectId().toString()

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

jest.mock('../../src/modules/teachers/models/Teacher.js', () => ({
  Teacher: {
    findOne: jest.fn().mockResolvedValue({
      _id: teacherId,
      schoolId,
      userId: userId1,
    }),
  },
}))

jest.mock('../../src/modules/auth/models/User.js', () => ({
  User: {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    }),
    findOne: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock('../../src/modules/notifications/services/notificationService.js', () => ({
  dispatchNotification: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  AuditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

const mockLeaveSave = jest.fn().mockResolvedValue(true)
const mockLeaveRequest = {
  _id: new mongoose.Types.ObjectId(),
  schoolId,
  requesterType: 'student',
  requesterId: studentId,
  submittedBy: userId1,
  startDate: new Date('2026-09-10'),
  endDate: new Date('2026-09-12'),
  reason: 'Family vacation',
  status: 'pending',
  save: mockLeaveSave,
}

jest.mock('../../src/modules/leave/models/LeaveRequest.js', () => ({
  LeaveRequest: {
    create: jest.fn().mockResolvedValue(mockLeaveRequest),
    findOne: jest.fn(),
  },
}))

const mockDisciplineRecord = {
  _id: new mongoose.Types.ObjectId(),
  schoolId,
  studentId,
  incidentDate: new Date('2026-09-01'),
  category: 'behavior',
  description: 'Disruptive behavior in class',
  reportedBy: userId1,
  severity: 'minor',
  status: 'open',
  followUp: [] as Array<{ date: Date; note: string; recordedBy: mongoose.Types.ObjectId }>,
  save: jest.fn().mockResolvedValue(true),
}

jest.mock('../../src/modules/discipline/models/DisciplineRecord.js', () => ({
  DisciplineRecord: {
    create: jest.fn().mockResolvedValue(mockDisciplineRecord),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}))

// ── Imports after mocks ──────────────────────────────────────────────

import { LeaveRequest } from '../../src/modules/leave/models/LeaveRequest.js'
import { DisciplineRecord } from '../../src/modules/discipline/models/DisciplineRecord.js'
import * as leaveService from '../../src/modules/leave/services/leaveService.js'
import * as disciplineService from '../../src/modules/discipline/services/disciplineService.js'

// ── Leave Tests ──────────────────────────────────────────────────────

describe('Leave Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Re-assign save after clearAllMocks
    mockLeaveRequest.save = jest.fn().mockResolvedValue(true)
  })

  describe('createLeaveRequest', () => {
    it('should create a leave request for a student', async () => {
      const result = await leaveService.createLeaveRequest(schoolId, userId1, {
        requesterType: 'student',
        requesterId: studentId,
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        reason: 'Family vacation',
      })

      expect(result).toBeDefined()
      expect(LeaveRequest.create).toHaveBeenCalled()
    })

    it('should reject when endDate is before startDate', async () => {
      await expect(
        leaveService.createLeaveRequest(schoolId, userId1, {
          requesterType: 'student',
          requesterId: studentId,
          startDate: '2026-09-12',
          endDate: '2026-09-10',
          reason: 'Test',
        }),
      ).rejects.toThrow('End date must be on or after start date')
    })
  })

  describe('cancelLeaveRequest', () => {
    it('should cancel a pending leave request', async () => {
      const leaveId = new mongoose.Types.ObjectId().toString()
      const mockLeave = {
        _id: leaveId,
        schoolId,
        submittedBy: userId1,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(LeaveRequest.findOne as jest.Mock).mockResolvedValue(mockLeave)

      const result = await leaveService.cancelLeaveRequest(schoolId, leaveId, userId1)
      expect(result.status).toBe('cancelled')
    })

    it('should reject cancelling a non-pending leave request', async () => {
      const leaveId = new mongoose.Types.ObjectId().toString()
      const mockLeave = {
        _id: leaveId,
        schoolId,
        submittedBy: userId1,
        status: 'approved',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(LeaveRequest.findOne as jest.Mock).mockResolvedValue(mockLeave)

      await expect(
        leaveService.cancelLeaveRequest(schoolId, leaveId, userId1),
      ).rejects.toThrow('Only pending leave requests can be cancelled')
    })

    it('should reject cancelling someone else leave request', async () => {
      const leaveId = new mongoose.Types.ObjectId().toString()
      const mockLeave = {
        _id: leaveId,
        schoolId,
        submittedBy: new mongoose.Types.ObjectId().toString(),
        requesterId: new mongoose.Types.ObjectId().toString(),
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(LeaveRequest.findOne as jest.Mock).mockResolvedValue(mockLeave)

      await expect(
        leaveService.cancelLeaveRequest(schoolId, leaveId, userId1),
      ).rejects.toThrow('You can only cancel your own leave request')
    })
  })
})

// ── Discipline Tests ─────────────────────────────────────────────────

describe('Discipline Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDisciplineRecord.followUp = []
  })

  describe('createDisciplineRecord', () => {
    it('should create a discipline record', async () => {
      const result = await disciplineService.createDisciplineRecord(schoolId, userId1, {
        studentId,
        incidentDate: '2026-09-01',
        category: 'behavior',
        description: 'Disruptive behavior in class',
        severity: 'minor',
      })

      expect(result).toBeDefined()
      expect(DisciplineRecord.create).toHaveBeenCalled()
    })
  })

  describe('listDisciplineRecords', () => {
    it('should reject parent role from listing discipline records', async () => {
      await expect(
        disciplineService.listDisciplineRecords(schoolId, userId1, ['parent'], {}),
      ).rejects.toThrow('Access denied: discipline records are not visible to parents/students')
    })

    it('should reject student role from listing discipline records', async () => {
      await expect(
        disciplineService.listDisciplineRecords(schoolId, userId1, ['student'], {}),
      ).rejects.toThrow('Access denied: discipline records are not visible to parents/students')
    })

    it('should allow school_admin to list discipline records', async () => {
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }
      ;(DisciplineRecord.find as jest.Mock).mockReturnValue(mockChain)
      ;(DisciplineRecord.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await disciplineService.listDisciplineRecords(schoolId, userId1, ['school_admin'], {})
      expect(result.records).toEqual([])
    })

    it('should scope teacher to only their own reports', async () => {
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }
      ;(DisciplineRecord.find as jest.Mock).mockReturnValue(mockChain)
      ;(DisciplineRecord.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await disciplineService.listDisciplineRecords(schoolId, userId1, ['teacher'], {})
      // Verify the query includes reportedBy filter
      expect(DisciplineRecord.find).toHaveBeenCalledWith(
        expect.objectContaining({ reportedBy: userId1 }),
      )
    })
  })

  describe('addFollowUp', () => {
    it('should add a follow-up note to a discipline record', async () => {
      const recordId = new mongoose.Types.ObjectId().toString()
      const mockRecord = {
        _id: recordId,
        schoolId,
        reportedBy: userId1,
        followUp: [],
        save: jest.fn().mockResolvedValue(true),
      }
      ;(DisciplineRecord.findOne as jest.Mock).mockResolvedValue(mockRecord)

      const result = await disciplineService.addFollowUp(
        schoolId,
        recordId,
        userId1,
        ['school_admin'],
        'Follow-up: counseling session completed',
      )

      expect(result.followUp).toHaveLength(1)
      expect(mockRecord.save).toHaveBeenCalled()
    })

    it('should reject unauthorized follow-up', async () => {
      const recordId = new mongoose.Types.ObjectId().toString()
      const otherUserId = new mongoose.Types.ObjectId().toString()
      const mockRecord = {
        _id: recordId,
        schoolId,
        reportedBy: otherUserId,
        followUp: [],
        save: jest.fn().mockResolvedValue(true),
      }
      ;(DisciplineRecord.findOne as jest.Mock).mockResolvedValue(mockRecord)

      await expect(
        disciplineService.addFollowUp(
          schoolId,
          recordId,
          userId1,
          ['teacher'],
          'Follow-up note',
        ),
      ).rejects.toThrow('Access denied')
    })
  })

  describe('updateDisciplineRecord', () => {
    it('should allow admin to update a record', async () => {
      const recordId = new mongoose.Types.ObjectId().toString()
      const mockRecord = {
        _id: recordId,
        schoolId,
        reportedBy: userId1,
        status: 'open',
        severity: 'minor',
        actionTaken: undefined,
        save: jest.fn().mockResolvedValue(true),
      }
      ;(DisciplineRecord.findOne as jest.Mock).mockResolvedValue(mockRecord)

      const result = await disciplineService.updateDisciplineRecord(
        schoolId,
        recordId,
        userId1,
        ['school_admin'],
        { status: 'resolved', actionTaken: 'Counseling completed' },
      )

      expect(result.status).toBe('resolved')
      expect(result.actionTaken).toBe('Counseling completed')
      expect(mockRecord.save).toHaveBeenCalled()
    })
  })
})
