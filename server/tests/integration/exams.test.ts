import mongoose from 'mongoose'
import { Exam } from '../../src/modules/exams/models/Exam.js'
import { Result } from '../../src/modules/exams/models/Result.js'
import { Student } from '../../src/modules/students/models/Student.js'
import { School } from '../../src/modules/schools/models/School.js'
import { Teacher } from '../../src/modules/teachers/models/Teacher.js'
import * as examService from '../../src/modules/exams/services/examService.js'

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
jest.spyOn(Exam, 'find')
jest.spyOn(Exam, 'findOne')
jest.spyOn(Exam, 'create')
jest.spyOn(Exam, 'countDocuments')
jest.spyOn(Exam, 'findByIdAndDelete')
jest.spyOn(Result, 'find')
jest.spyOn(Result, 'findOne')
jest.spyOn(Result, 'findOneAndUpdate')
jest.spyOn(Result, 'countDocuments')
jest.spyOn(Result, 'updateMany')
jest.spyOn(Student, 'find')
jest.spyOn(School, 'findById')
jest.spyOn(Teacher, 'findOne')

// ── Tests ────────────────────────────────────────────────────────────

describe('Exam Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('deleteExam', () => {
    it('rejects deletion with existing results', async () => {
      const examId = new mongoose.Types.ObjectId()
      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'draft',
        toObject: jest.fn().mockReturnThis(),
      })
      ;(Result.countDocuments as jest.Mock).mockResolvedValue(5)

      await expect(
        examService.deleteExam(schoolId, examId.toString(), userId),
      ).rejects.toThrow('5 result(s)')
    })

    it('rejects deletion of published exam', async () => {
      const examId = new mongoose.Types.ObjectId()
      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'published',
        toObject: jest.fn().mockReturnThis(),
      })

      await expect(
        examService.deleteExam(schoolId, examId.toString(), userId),
      ).rejects.toThrow('Cannot delete a published exam')
    })
  })

  describe('publishExam', () => {
    it('rejects publishing already published exam', async () => {
      const examId = new mongoose.Types.ObjectId()
      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'published',
        toObject: jest.fn().mockReturnThis(),
      })

      await expect(
        examService.publishExam(schoolId, examId.toString(), userId),
      ).rejects.toThrow('already published')
    })

    it('rejects publish when marks are incomplete', async () => {
      const examId = new mongoose.Types.ObjectId()
      const classId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'completed',
        classIds: [classId],
        schedule: [
          { subjectId: new mongoose.Types.ObjectId(), maxMarks: 100, passMarks: 40 },
          { subjectId: new mongoose.Types.ObjectId(), maxMarks: 100, passMarks: 40 },
        ],
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      })
      ;(Student.find as jest.Mock).mockResolvedValue([
        { _id: studentId, profile: { firstName: 'John', lastName: 'Doe' } },
      ])
      // Only 1 subject mark entered, but schedule has 2
      ;(Result.findOne as jest.Mock).mockResolvedValue({
        subjectMarks: [{ subjectId: new mongoose.Types.ObjectId() }],
      })

      await expect(
        examService.publishExam(schoolId, examId.toString(), userId),
      ).rejects.toThrow('missing marks')
    })
  })

  describe('correctMarks', () => {
    it('rejects marks exceeding maxMarks', async () => {
      const examId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()
      const subjectId = new mongoose.Types.ObjectId()

      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'published',
        schedule: [{ subjectId, maxMarks: 100, passMarks: 40 }],
      })

      await expect(
        examService.correctMarks(schoolId, examId.toString(), studentId.toString(), {
          marksObtained: 150,
          subjectId: subjectId.toString(),
        }, userId),
      ).rejects.toThrow('exceed max marks')
    })
  })

  describe('enterMarks', () => {
    it('rejects marks for published exam', async () => {
      const examId = new mongoose.Types.ObjectId()

      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'published',
        schedule: [],
      })
      ;(Teacher.findOne as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() })

      await expect(
        examService.enterMarks(schoolId, examId.toString(), {
          classId: new mongoose.Types.ObjectId().toString(),
          subjectId: new mongoose.Types.ObjectId().toString(),
          entries: [{ studentId: 's1', marksObtained: 50 }],
        }, userId),
      ).rejects.toThrow('published exam')
    })

    it('rejects marks exceeding maxMarks', async () => {
      const examId = new mongoose.Types.ObjectId()
      const subjectId = new mongoose.Types.ObjectId()

      ;(Exam.findOne as jest.Mock).mockResolvedValue({
        _id: examId,
        status: 'draft',
        schedule: [{ subjectId, maxMarks: 100, passMarks: 40 }],
      })
      ;(Teacher.findOne as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() })

      await expect(
        examService.enterMarks(schoolId, examId.toString(), {
          classId: new mongoose.Types.ObjectId().toString(),
          subjectId: subjectId.toString(),
          entries: [{ studentId: 's1', marksObtained: 150 }],
        }, userId),
      ).rejects.toThrow('exceed max marks')
    })
  })
})
