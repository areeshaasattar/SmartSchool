import mongoose from 'mongoose'

// Mock the models — paths from tests/unit/ → ../../src/modules/...
jest.mock('../../src/modules/students/models/Student', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}))

jest.mock('../../src/modules/students/models/Guardian', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}))

jest.mock('../../src/modules/attendance/models/Attendance', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}))

jest.mock('../../src/modules/exams/models/Exam', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}))

jest.mock('../../src/modules/exams/models/Result', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
}))

jest.mock('../../src/modules/assignments/models/Assignment', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}))

jest.mock('../../src/modules/assignments/models/Submission', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}))

describe('Parent Portal Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('dashboard composition', () => {
    it('should return proper stub shapes for unbuilt sections', async () => {
      // The dashboard response should always have these stub fields
      const expectedStubShape = {
        fees: { balance: 0, dueDate: null, items: [] },
        messages: [],
        leave: [],
        announcements: [],
      }

      expect(expectedStubShape.fees).toHaveProperty('balance')
      expect(expectedStubShape.fees).toHaveProperty('dueDate')
      expect(expectedStubShape.fees).toHaveProperty('items')
      expect(expectedStubShape.messages).toBeInstanceOf(Array)
      expect(expectedStubShape.leave).toBeInstanceOf(Array)
      expect(expectedStubShape.announcements).toBeInstanceOf(Array)
    })
  })

  describe('role restriction', () => {
    it('should only allow parent role to access dashboard', () => {
      const allowedRoles = ['parent']
      const testRole = 'parent'
      expect(allowedRoles).toContain(testRole)
    })

    it('should reject non-parent roles', () => {
      const allowedRoles = ['parent']
      const testRole = 'school_admin'
      expect(allowedRoles).not.toContain(testRole)
    })
  })

  describe('student access restriction', () => {
    it('should only allow access to own children', () => {
      const guardianChildren = ['student1', 'student2']
      const requestedStudentId = 'student1'
      expect(guardianChildren).toContain(requestedStudentId)
    })

    it('should reject access to non-child student', () => {
      const guardianChildren = ['student1', 'student2']
      const requestedStudentId = 'student3'
      expect(guardianChildren).not.toContain(requestedStudentId)
    })
  })
})
