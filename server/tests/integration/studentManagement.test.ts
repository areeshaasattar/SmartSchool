import request from 'supertest'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { generateAccessToken } from '../../src/shared/tokens'

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')

  const mockModels: Record<string, Record<string, unknown>> = {}

  function getOrCreate(name: string) {
    if (!mockModels[name]) {
      mockModels[name] = {
        findOne: jest.fn(),
        findById: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        countDocuments: jest.fn(),
        save: jest.fn(),
      }
    }
    return mockModels[name]
  }

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn((name: string) => getOrCreate(name)),
    Schema: actualMongoose.Schema,
    Types: actualMongoose.Types,
  }
})

// Mock Redis
jest.mock('../../src/shared/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(900),
  }),
}))

// Mock password hashing
jest.mock('../../src/shared/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn().mockResolvedValue(true),
}))

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV = 'test'

import routes from '../../src/routes/index'

let app: express.Application

beforeAll(() => {
  app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api', routes)
})

function makeToken(user: { id: string; email: string; roles: string[] }) {
  return generateAccessToken({ userId: user.id, email: user.email, roles: user.roles })
}

function stubAuth(user: { id: string; email: string; roles: string[]; schoolIds?: string[] }) {
  const User = mongoose.model('User')
  ;(User.findById as jest.Mock).mockResolvedValue({
    _id: user.id,
    email: user.email,
    roles: user.roles,
    schoolIds: (user.schoolIds || []).map((s) => new mongoose.Types.ObjectId(s)),
    profile: { firstName: 'Test', lastName: 'User' },
    status: 'active',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Test data ────────────────────────────────────────────────────────

const schoolId1 = new mongoose.Types.ObjectId().toString()
const schoolId2 = new mongoose.Types.ObjectId().toString()

const superAdmin = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'superadmin@example.com',
  roles: ['super_admin'],
  schoolIds: [] as string[],
}

const schoolAdmin = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'schooladmin@example.com',
  roles: ['school_admin'],
  schoolIds: [schoolId1],
}

const parent = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'parent@example.com',
  roles: ['parent'],
  schoolIds: [schoolId1],
}

const teacher = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'teacher@example.com',
  roles: ['teacher'],
  schoolIds: [schoolId1],
}

// ── POST /students — create student ──────────────────────────────────

describe('POST /api/students', () => {
  it('should allow school_admin to create a student', async () => {
    stubAuth(schoolAdmin)

    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue(null) // no duplicate
    ;(Student.create as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      admissionNo: 'ADM001',
      profile: { firstName: 'Alice', lastName: 'Smith', dob: new Date('2010-01-15'), gender: 'female' },
      emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      status: 'active',
      guardianIds: [],
      save: jest.fn(),
    })

    const AuditLog = mongoose.model('AuditLog')
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({
        admissionNo: 'ADM001',
        profile: { firstName: 'Alice', lastName: 'Smith', dob: '2010-01-15', gender: 'female' },
        emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      })

    expect(res.status).toBe(201)
    expect(res.body.student.admissionNo).toBe('ADM001')
  })

  it('should reject duplicate admission number per school', async () => {
    stubAuth(schoolAdmin)

    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue({ admissionNo: 'ADM001' }) // duplicate exists

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({
        admissionNo: 'ADM001',
        profile: { firstName: 'Alice', lastName: 'Smith', dob: '2010-01-15', gender: 'female' },
        emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      })

    expect(res.status).toBe(409)
  })

  it('should reject teacher from creating students', async () => {
    stubAuth(teacher)

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${makeToken(teacher)}`)
      .set('X-School-Id', schoolId1)
      .send({
        admissionNo: 'ADM001',
        profile: { firstName: 'Alice', lastName: 'Smith', dob: '2010-01-15', gender: 'female' },
        emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      })

    expect(res.status).toBe(403)
  })
})

// ── GET /students — list students ────────────────────────────────────

describe('GET /api/students', () => {
  it('should allow school_admin to list students', async () => {
    stubAuth(schoolAdmin)

    const Student = mongoose.model('Student')
    ;(Student.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    })
    ;(Student.countDocuments as jest.Mock).mockResolvedValue(0)

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    expect(res.body.students).toEqual([])
  })

  it('should filter students by parent userId', async () => {
    stubAuth(parent)

    const Guardian = mongoose.model('Guardian')
    ;(Guardian.find as jest.Mock).mockResolvedValue([
      { _id: new mongoose.Types.ObjectId() },
    ])

    const Student = mongoose.model('Student')
    ;(Student.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([
        { _id: 's1', admissionNo: 'ADM001', profile: { firstName: 'Child', lastName: 'One' }, status: 'active' },
      ]),
    })
    ;(Student.countDocuments as jest.Mock).mockResolvedValue(1)

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${makeToken(parent)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    // Verify the filter included guardianIds constraint
    const findCall = (Student.find as jest.Mock).mock.calls[0]
    expect(findCall[0]).toHaveProperty('guardianIds')
  })
})

// ── DELETE /students/:id — soft delete ───────────────────────────────

describe('DELETE /api/students/:id', () => {
  it('should soft delete (set status inactive)', async () => {
    stubAuth(schoolAdmin)

    const studentId = new mongoose.Types.ObjectId().toString()
    const mockStudent = {
      _id: studentId,
      status: 'active',
      admissionNo: 'ADM001',
      save: jest.fn().mockImplementation(function (this: Record<string, unknown>) {
        this.status = 'inactive'
        return Promise.resolve(this)
      }),
    }

    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue(mockStudent)

    const AuditLog = mongoose.model('AuditLog')
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    const res = await request(app)
      .delete(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    expect(mockStudent.save).toHaveBeenCalled()
    expect(res.body.student.status).toBe('inactive')
  })

  it('should reject soft delete of non-existent student', async () => {
    stubAuth(schoolAdmin)

    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .delete(`/api/students/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(404)
  })
})

// ── Tenant isolation ─────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it('should reject school_admin from accessing students in another school', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId2) // different school

    expect(res.status).toBe(403)
  })

  it('should require X-School-Id header', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)

    expect(res.status).toBe(403)
  })
})

// ── Audit logging ────────────────────────────────────────────────────

describe('Audit logging', () => {
  it('should write audit log on student creation', async () => {
    stubAuth(schoolAdmin)

    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue(null)
    ;(Student.create as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      admissionNo: 'ADM001',
      profile: { firstName: 'Alice', lastName: 'Smith', dob: new Date('2010-01-15'), gender: 'female' },
      emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      status: 'active',
      guardianIds: [],
      save: jest.fn(),
    })

    const AuditLog = mongoose.model('AuditLog')
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({
        admissionNo: 'ADM001',
        profile: { firstName: 'Alice', lastName: 'Smith', dob: '2010-01-15', gender: 'female' },
        emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
      })

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'student:create',
        entity: 'Student',
      }),
    )
  })

  it('should write audit log on student soft delete', async () => {
    stubAuth(schoolAdmin)

    const studentId = new mongoose.Types.ObjectId().toString()
    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockResolvedValue({
      _id: studentId,
      status: 'active',
      admissionNo: 'ADM001',
      save: jest.fn().mockImplementation(function (this: Record<string, unknown>) {
        this.status = 'inactive'
        return Promise.resolve(this)
      }),
    })

    const AuditLog = mongoose.model('AuditLog')
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    await request(app)
      .delete(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'student:delete',
        entity: 'Student',
        before: { status: 'active' },
        after: { status: 'inactive' },
      }),
    )
  })
})

// ── Student 360 ──────────────────────────────────────────────────────

describe('GET /api/students/:id/360', () => {
  it('should return student 360 with stubbed sections', async () => {
    stubAuth(schoolAdmin)

    const studentId = new mongoose.Types.ObjectId().toString()
    const Student = mongoose.model('Student')
    ;(Student.findOne as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: studentId,
        admissionNo: 'ADM001',
        profile: { firstName: 'Alice', lastName: 'Smith', dob: new Date('2010-01-15'), gender: 'female' },
        emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '+1234567890' },
        status: 'active',
        classId: null,
        sectionId: null,
        academicYearId: null,
        guardianIds: [],
      }),
    })

    const res = await request(app)
      .get(`/api/students/${studentId}/360`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    expect(res.body.student360.profile.firstName).toBe('Alice')
    expect(res.body.student360.attendance).toEqual([])
    expect(res.body.student360.grades).toEqual([])
    expect(res.body.student360.fees).toBeNull()
    expect(res.body.student360.documents).toEqual([])
    expect(res.body.student360.behavior).toEqual([])
  })
})
