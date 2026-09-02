import mongoose from 'mongoose'
import express from 'express'
import request from 'supertest'
import { Guardian } from '../../src/modules/students/models/Guardian.js'
import { Student } from '../../src/modules/students/models/Student.js'
import { Attendance } from '../../src/modules/attendance/models/Attendance.js'
import { Exam } from '../../src/modules/exams/models/Exam.js'
import { Result } from '../../src/modules/exams/models/Result.js'
import { Assignment } from '../../src/modules/assignments/models/Assignment.js'
import { Submission } from '../../src/modules/assignments/models/Submission.js'
import { FeeInvoice } from '../../src/modules/finance/models/FeeInvoice.js'
import portalRoutes from '../../src/modules/parent-portal/routes/portalRoutes.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()
const studentId = new mongoose.Types.ObjectId().toString()
const classId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId, email: 'parent@test.com', roles: ['parent'], schoolIds: [schoolId] }
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

// ── Spy on model methods
jest.spyOn(Guardian, 'find')
jest.spyOn(Guardian, 'findOne')
jest.spyOn(Student, 'find')
jest.spyOn(Student, 'findOne')
jest.spyOn(Attendance, 'countDocuments')
jest.spyOn(Exam, 'find')
jest.spyOn(Result, 'find')
jest.spyOn(Assignment, 'find')
jest.spyOn(Submission, 'findOne')
jest.spyOn(FeeInvoice, 'find')

// ── App setup ────────────────────────────────────────────────────────

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/parent-portal', portalRoutes)
  return app
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Parent Portal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /parent-portal/children', () => {
    it('returns the parent\'s children', async () => {
      ;(Guardian.find as jest.Mock).mockResolvedValue([
        { userId, schoolId, children: [studentId] },
      ])
      ;(Student.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue([
          { _id: studentId, admissionNo: 'ADM001', profile: { firstName: 'John', lastName: 'Doe' } },
        ]),
      })

      const app = createApp()
      const res = await request(app).get('/parent-portal/children')

      expect(res.status).toBe(200)
      expect(res.body.children).toHaveLength(1)
    })

    it('returns empty array when guardian has no children', async () => {
      ;(Guardian.find as jest.Mock).mockResolvedValue([
        { userId, schoolId, children: [] },
      ])

      const app = createApp()
      const res = await request(app).get('/parent-portal/children')

      expect(res.status).toBe(200)
      expect(res.body.children).toHaveLength(0)
    })
  })

  describe('GET /parent-portal/dashboard', () => {
    it('returns 400 when studentId is missing', async () => {
      const app = createApp()
      const res = await request(app).get('/parent-portal/dashboard')

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('studentId')
    })

    it('returns 403 when student is not the parent\'s child', async () => {
      ;(Guardian.findOne as jest.Mock).mockResolvedValue(null)

      const app = createApp()
      const res = await request(app)
        .get('/parent-portal/dashboard')
        .query({ studentId })

      expect(res.status).toBe(403)
    })

    it('returns dashboard data for own child', async () => {
      ;(Guardian.findOne as jest.Mock).mockResolvedValue({
        userId,
        schoolId,
        children: [studentId],
      })
      ;(Student.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: studentId,
          admissionNo: 'ADM001',
          profile: { firstName: 'John', lastName: 'Doe' },
          status: 'active',
          classId,
          sectionId: null,
          academicYearId: new mongoose.Types.ObjectId(),
        }),
      })
      ;(Attendance.countDocuments as jest.Mock)
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18) // present
      ;(Exam.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })
      ;(Result.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })
      ;(Assignment.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })
      ;(FeeInvoice.find as jest.Mock).mockResolvedValue([])

      const app = createApp()
      const res = await request(app)
        .get('/parent-portal/dashboard')
        .query({ studentId })

      expect(res.status).toBe(200)
      expect(res.body.student.id).toBe(studentId)
      expect(res.body.attendance.percentage).toBe(90)
      expect(res.body.upcomingExams).toEqual([])
      expect(res.body.recentResults).toEqual([])
      expect(res.body.recentAssignments).toEqual([])
      // Fee data (null if no invoices)
      expect(res.body.fees).toBeNull()
      expect(res.body.messages).toHaveProperty('unread')
      expect(res.body.leave).toHaveProperty('pending')
      expect(res.body.announcements).toHaveProperty('count')
    })
  })
})
