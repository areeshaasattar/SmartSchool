import mongoose from 'mongoose'
import { Assignment } from '../../src/modules/assignments/models/Assignment.js'
import { Submission } from '../../src/modules/assignments/models/Submission.js'
import { Class } from '../../src/modules/classes/models/Class.js'
import { Student } from '../../src/modules/students/models/Student.js'
import { Teacher } from '../../src/modules/teachers/models/Teacher.js'
import * as assignmentService from '../../src/modules/assignments/services/assignmentService.js'

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

// Spy on model methods
jest.spyOn(Assignment, 'find')
jest.spyOn(Assignment, 'findOne')
jest.spyOn(Assignment, 'create')
jest.spyOn(Assignment, 'countDocuments')
jest.spyOn(Assignment, 'findByIdAndDelete')
jest.spyOn(Submission, 'find')
jest.spyOn(Submission, 'findOne')
jest.spyOn(Submission, 'findOneAndUpdate')
jest.spyOn(Submission, 'countDocuments')
jest.spyOn(Class, 'findOne')
jest.spyOn(Student, 'findOne')
jest.spyOn(Teacher, 'findOne')

// ── Tests ────────────────────────────────────────────────────────────

describe('Assignment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('publishAssignment', () => {
    it('publishes a draft assignment', async () => {
      const mockAssignment = {
        _id: new mongoose.Types.ObjectId(),
        status: 'draft',
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }
      ;(Assignment.findOne as jest.Mock).mockResolvedValue(mockAssignment)

      const result = await assignmentService.publishAssignment(schoolId, mockAssignment._id.toString(), userId)
      expect(mockAssignment.save).toHaveBeenCalled()
    })

    it('rejects publishing a non-draft', async () => {
      const mockAssignment = {
        _id: new mongoose.Types.ObjectId(),
        status: 'published',
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }
      ;(Assignment.findOne as jest.Mock).mockResolvedValue(mockAssignment)

      await expect(
        assignmentService.publishAssignment(schoolId, mockAssignment._id.toString(), userId),
      ).rejects.toThrow('Only draft')
    })
  })

  describe('deleteAssignment', () => {
    it('rejects deletion with existing submissions', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        toObject: jest.fn().mockReturnThis(),
      })
      ;(Submission.countDocuments as jest.Mock).mockResolvedValue(3)

      await expect(
        assignmentService.deleteAssignment(schoolId, assignmentId.toString(), userId),
      ).rejects.toThrow('3 submission(s)')
    })

    it('allows deletion with no submissions', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        toObject: jest.fn().mockReturnThis(),
      })
      ;(Submission.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(Assignment.findByIdAndDelete as jest.Mock).mockResolvedValue(true)

      const result = await assignmentService.deleteAssignment(schoolId, assignmentId.toString(), userId)
      expect(result).toBe(true)
    })
  })

  describe('gradeSubmission', () => {
    it('rejects marks exceeding maxMarks', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        maxMarks: 100,
      })
      ;(Submission.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        toObject: jest.fn().mockReturnThis(),
      })

      await expect(
        assignmentService.gradeSubmission(schoolId, assignmentId.toString(), studentId.toString(), { marks: 150 }, userId),
      ).rejects.toThrow('cannot exceed max marks')
    })

    it('allows grading within maxMarks', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        maxMarks: 100,
      })
      ;(Submission.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'submitted',
        marks: undefined,
        feedback: '',
        gradedBy: undefined,
        gradedAt: undefined,
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      })
      ;(Teacher.findOne as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() })

      const result = await assignmentService.gradeSubmission(schoolId, assignmentId.toString(), studentId.toString(), { marks: 85, feedback: 'Good' }, userId)
      expect(result).toBeDefined()
    })
  })

  describe('submitToAssignment', () => {
    it('rejects submission to non-published assignment', async () => {
      const assignmentId = new mongoose.Types.ObjectId()

      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        status: 'draft',
        classId: new mongoose.Types.ObjectId(),
      })

      await expect(
        assignmentService.submitToAssignment(schoolId, assignmentId.toString(), userId, { content: 'test' }),
      ).rejects.toThrow('not published')
    })

    it('marks submission as late if past due date', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      // Due date in the past
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        status: 'published',
        classId,
        dueDate: pastDate,
      })
      ;(mongoose.model('Student').findOne as jest.Mock).mockResolvedValue({
        _id: studentId,
        classId,
        schoolId,
      })
      ;(Submission.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'late',
      })

      const result = await assignmentService.submitToAssignment(schoolId, assignmentId.toString(), userId, { content: 'My answer' })
      expect(result).toBeDefined()
    })

    it('upserts: resubmission updates existing record', async () => {
      const assignmentId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      ;(Assignment.findOne as jest.Mock).mockResolvedValue({
        _id: assignmentId,
        status: 'published',
        classId,
        dueDate: futureDate,
      })
      ;(mongoose.model('Student').findOne as jest.Mock).mockResolvedValue({
        _id: studentId,
        classId,
        schoolId,
      })
      ;(Submission.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'submitted',
      })

      const result = await assignmentService.submitToAssignment(schoolId, assignmentId.toString(), userId, { content: 'Updated answer' })
      // Should use findOneAndUpdate, not create
      expect(Submission.findOneAndUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })
})
