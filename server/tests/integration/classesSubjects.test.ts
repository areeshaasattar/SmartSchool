import mongoose from 'mongoose'
import { Class } from '../../src/modules/classes/models/Class.js'
import { Subject } from '../../src/modules/classes/models/Subject.js'
import { Student } from '../../src/modules/students/models/Student.js'
import { Teacher } from '../../src/modules/teachers/models/Teacher.js'
import * as classService from '../../src/modules/classes/services/classService.js'

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

// Mock all Mongoose model methods used by the service
jest.spyOn(Class, 'findOne')
jest.spyOn(Class, 'create')
jest.spyOn(Class, 'countDocuments')
jest.spyOn(Class, 'findByIdAndDelete')
jest.spyOn(Class, 'find')

jest.spyOn(Subject, 'findOne')
jest.spyOn(Subject, 'create')
jest.spyOn(Subject, 'findByIdAndDelete')
jest.spyOn(Subject, 'find')

jest.spyOn(Student, 'countDocuments')
jest.spyOn(Student, 'findOne')

jest.spyOn(Teacher, 'findOne')

// ── Tests ────────────────────────────────────────────────────────────

describe('Class Management', () => {
  const academicYearId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createClass', () => {
    it('creates a class successfully', async () => {
      const mockClass = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        grade: '10',
        section: 'A',
        academicYearId,
        teacherIds: [],
        classTeacherId: null,
        subjectIds: [],
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }
      ;(Class.findOne as jest.Mock).mockResolvedValue(null)
      ;(Class.create as jest.Mock).mockResolvedValue(mockClass)

      const cls = await classService.createClass(schoolId, {
        grade: '10',
        section: 'A',
        academicYearId,
      }, userId)

      expect(cls.grade).toBe('10')
      expect(cls.section).toBe('A')
    })

    it('rejects duplicate grade/section/year', async () => {
      ;(Class.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' })

      await expect(
        classService.createClass(schoolId, {
          grade: '10',
          section: 'A',
          academicYearId,
        }, userId),
      ).rejects.toThrow('already exists')
    })
  })

  describe('deleteClass', () => {
    it('rejects deletion with enrolled students', async () => {
      const classId = new mongoose.Types.ObjectId()
      const mockClass = { _id: classId, toObject: jest.fn().mockReturnThis() }
      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Student.countDocuments as jest.Mock).mockResolvedValue(3)

      await expect(
        classService.deleteClass(schoolId, classId.toString(), userId),
      ).rejects.toThrow('Cannot delete class with 3 enrolled students')
    })

    it('allows deletion with no enrolled students', async () => {
      const classId = new mongoose.Types.ObjectId()
      const mockClass = { _id: classId, toObject: jest.fn().mockReturnThis() }
      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Student.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(Class.findByIdAndDelete as jest.Mock).mockResolvedValue(mockClass)

      const result = await classService.deleteClass(schoolId, classId.toString(), userId)
      expect(result).toBe(true)
    })
  })

  describe('enrollStudent', () => {
    it('enrolls a student into a class', async () => {
      const classId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      const mockClass = {
        _id: classId,
        academicYearId: new mongoose.Types.ObjectId(),
        toObject: jest.fn().mockReturnThis(),
      }
      const mockStudent = {
        _id: studentId,
        classId: null,
        academicYearId: null,
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }

      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Student.findOne as jest.Mock).mockResolvedValue(mockStudent)

      await classService.enrollStudent(schoolId, classId.toString(), studentId.toString(), userId)
      expect(mockStudent.save).toHaveBeenCalled()
      expect(mockStudent.classId).toEqual(classId)
    })

    it('rejects enrollment in different academic year', async () => {
      const classId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      const mockClass = {
        _id: classId,
        academicYearId: new mongoose.Types.ObjectId(),
        toObject: jest.fn().mockReturnThis(),
      }
      const mockStudent = {
        _id: studentId,
        classId: null,
        academicYearId: new mongoose.Types.ObjectId(), // different year
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }

      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Student.findOne as jest.Mock).mockResolvedValue(mockStudent)

      await expect(
        classService.enrollStudent(schoolId, classId.toString(), studentId.toString(), userId),
      ).rejects.toThrow('same academic year')
    })

    it('rejects duplicate enrollment', async () => {
      const classId = new mongoose.Types.ObjectId()
      const studentId = new mongoose.Types.ObjectId()

      const mockClass = {
        _id: classId,
        academicYearId: new mongoose.Types.ObjectId(),
        toObject: jest.fn().mockReturnThis(),
      }
      const mockStudent = {
        _id: studentId,
        classId: classId, // already enrolled in this class
        academicYearId: null,
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }

      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Student.findOne as jest.Mock).mockResolvedValue(mockStudent)

      await expect(
        classService.enrollStudent(schoolId, classId.toString(), studentId.toString(), userId),
      ).rejects.toThrow('already enrolled')
    })
  })

  describe('assignSubjectToClass', () => {
    it('assigns subject and teacher to class', async () => {
      const classId = new mongoose.Types.ObjectId()
      const subjectId = new mongoose.Types.ObjectId()
      const teacherId = new mongoose.Types.ObjectId()

      const mockClass = {
        _id: classId,
        subjectIds: [],
        teacherIds: [],
        save: jest.fn(),
        toObject: jest.fn().mockReturnThis(),
      }
      const mockSubject = { _id: subjectId }
      const mockTeacher = { _id: teacherId }

      ;(Class.findOne as jest.Mock).mockResolvedValue(mockClass)
      ;(Subject.findOne as jest.Mock).mockResolvedValue(mockSubject)

      // Teacher model mock is already spied on
      ;(Teacher.findOne as jest.Mock).mockResolvedValue(mockTeacher)

      const result = await classService.assignSubjectToClass(
        schoolId, classId.toString(), subjectId.toString(), teacherId.toString(), userId,
      )
      expect(mockClass.save).toHaveBeenCalled()
      expect(mockClass.subjectIds.length).toBe(1)
      expect(mockClass.teacherIds.length).toBe(1)
    })
  })
})

describe('Subject Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createSubject', () => {
    it('creates a subject successfully', async () => {
      const mockSubject = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Mathematics',
        code: 'MATH101',
        gradeMappings: [],
        toObject: jest.fn().mockReturnThis(),
      }
      ;(Subject.findOne as jest.Mock).mockResolvedValue(null)
      ;(Subject.create as jest.Mock).mockResolvedValue(mockSubject)

      const subject = await classService.createSubject(schoolId, {
        name: 'Mathematics',
        code: 'MATH101',
      }, userId)

      expect(subject.name).toBe('Mathematics')
    })

    it('rejects duplicate subject code', async () => {
      ;(Subject.findOne as jest.Mock).mockResolvedValue({ code: 'MATH101' })

      await expect(
        classService.createSubject(schoolId, {
          name: 'Mathematics',
          code: 'MATH101',
        }, userId),
      ).rejects.toThrow('already exists')
    })
  })

  describe('deleteSubject', () => {
    it('rejects deletion when assigned to a class', async () => {
      const subjectId = new mongoose.Types.ObjectId()
      const mockSubject = { _id: subjectId, toObject: jest.fn().mockReturnThis() }
      ;(Subject.findOne as jest.Mock).mockResolvedValue(mockSubject)
      ;(Class.findOne as jest.Mock).mockResolvedValue({ _id: 'class-using-subject' })

      await expect(
        classService.deleteSubject(schoolId, subjectId.toString(), userId),
      ).rejects.toThrow('Cannot delete subject that is assigned')
    })

    it('allows deletion when not assigned', async () => {
      const subjectId = new mongoose.Types.ObjectId()
      const mockSubject = { _id: subjectId, toObject: jest.fn().mockReturnThis() }
      ;(Subject.findOne as jest.Mock).mockResolvedValue(mockSubject)
      ;(Class.findOne as jest.Mock).mockResolvedValue(null)
      ;(Subject.findByIdAndDelete as jest.Mock).mockResolvedValue(mockSubject)

      const result = await classService.deleteSubject(schoolId, subjectId.toString(), userId)
      expect(result).toBe(true)
    })
  })
})
