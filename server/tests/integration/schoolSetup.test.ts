import request from 'supertest'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { generateAccessToken } from '../../src/shared/tokens'

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')

  const mockSchoolModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  }

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  }

  const mockAuditLogModel = {
    create: jest.fn(),
  }

  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn((name: string) => {
      if (name === 'School') return mockSchoolModel
      if (name === 'User') return mockUserModel
      if (name === 'AuditLog') return mockAuditLogModel
      return {}
    }),
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

const teacher = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'teacher@example.com',
  roles: ['teacher'],
  schoolIds: [schoolId1],
}

// ── GET /schools/:id ─────────────────────────────────────────────────

describe('GET /api/schools/:id', () => {
  it('should allow super_admin to view any school', async () => {
    stubAuth(superAdmin)

    const School = mongoose.model('School')
    ;(School.findById as jest.Mock).mockResolvedValue({
      _id: schoolId1,
      name: 'Test School',
      code: 'TST01',
      status: 'active',
      settings: { timezone: 'UTC', locale: 'en', academicWeekStart: 1, gradingScale: 'letter', contact: {}, branding: {} },
      academicYears: [],
      subscription: { plan: 'free', status: 'active', seatLimit: 50 },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await request(app)
      .get(`/api/schools/${schoolId1}`)
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    expect(res.body.school.name).toBe('Test School')
  })

  it('should allow school_admin to view their own school', async () => {
    stubAuth(schoolAdmin)

    const School = mongoose.model('School')
    ;(School.findById as jest.Mock).mockResolvedValue({
      _id: schoolId1,
      name: 'My School',
      code: 'MS01',
      status: 'active',
      settings: { timezone: 'UTC', locale: 'en', academicWeekStart: 1, gradingScale: 'letter', contact: {}, branding: {} },
      academicYears: [],
      subscription: { plan: 'free', status: 'active', seatLimit: 50 },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const res = await request(app)
      .get(`/api/schools/${schoolId1}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(200)
    expect(res.body.school.name).toBe('My School')
  })

  it('should reject school_admin viewing another school', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .get(`/api/schools/${schoolId2}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(403)
  })

  it('should reject teacher from viewing school details', async () => {
    stubAuth(teacher)

    const res = await request(app)
      .get(`/api/schools/${schoolId1}`)
      .set('Authorization', `Bearer ${makeToken(teacher)}`)
      .set('X-School-Id', schoolId1)

    expect(res.status).toBe(403)
  })
})

// ── PATCH /schools/:id (settings update) ─────────────────────────────

describe('PATCH /api/schools/:id (settings)', () => {
  it('should allow school_admin to update their own school settings', async () => {
    stubAuth(schoolAdmin)

    const mockSchool = {
      _id: schoolId1,
      name: 'Old Name',
      code: 'TST01',
      status: 'active',
      settings: { timezone: 'UTC', locale: 'en', academicWeekStart: 1, gradingScale: 'letter', contact: {}, branding: {} },
      save: jest.fn().mockResolvedValue(true),
    }

    const School = mongoose.model('School')
    ;(School.findById as jest.Mock).mockResolvedValue(mockSchool)

    const res = await request(app)
      .patch(`/api/schools/${schoolId1}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ name: 'New Name' })

    expect(res.status).toBe(200)
    expect(res.body.school.name).toBe('New Name')
  })

  it('should reject school_admin updating another school', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .patch(`/api/schools/${schoolId2}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ name: 'Hacked' })

    expect(res.status).toBe(403)
  })

  it('should write audit log on settings update', async () => {
    stubAuth(schoolAdmin)

    const AuditLog = mongoose.model('AuditLog')
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    const mockSchool = {
      _id: schoolId1,
      name: 'Old Name',
      code: 'TST01',
      status: 'active',
      settings: { timezone: 'UTC', locale: 'en', academicWeekStart: 1, gradingScale: 'letter', contact: {}, branding: {} },
      save: jest.fn().mockResolvedValue(true),
    }

    const School = mongoose.model('School')
    ;(School.findById as jest.Mock).mockResolvedValue(mockSchool)

    await request(app)
      .patch(`/api/schools/${schoolId1}`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ settings: { timezone: 'America/New_York' } })

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'school:update_settings',
        entity: 'School',
      }),
    )
  })
})

// ── Academic years ───────────────────────────────────────────────────

describe('Academic years', () => {
  const mockSchool = {
    _id: schoolId1,
    name: 'Test School',
    code: 'TST01',
    status: 'active',
    settings: { timezone: 'UTC', locale: 'en', academicWeekStart: 1, gradingScale: 'letter', contact: {}, branding: {} },
    academicYears: [
      {
        _id: new mongoose.Types.ObjectId(),
        label: '2024-2025',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2025-06-30'),
        isCurrent: true,
      },
    ],
    subscription: { plan: 'free', status: 'active', seatLimit: 50 },
    save: jest.fn().mockResolvedValue(true),
    toObject: jest.fn(),
  }

  describe('GET /api/schools/:id/academic-years', () => {
    it('should allow school_admin to list academic years', async () => {
      stubAuth(schoolAdmin)

      const School = mongoose.model('School')
      ;(School.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          academicYears: mockSchool.academicYears,
        }),
      })

      const res = await request(app)
        .get(`/api/schools/${schoolId1}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
        .set('X-School-Id', schoolId1)

      expect(res.status).toBe(200)
      expect(res.body.academicYears).toHaveLength(1)
      expect(res.body.academicYears[0].label).toBe('2024-2025')
    })

    it('should reject viewing another school academic years', async () => {
      stubAuth(schoolAdmin)

      const res = await request(app)
        .get(`/api/schools/${schoolId2}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
        .set('X-School-Id', schoolId1)

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/schools/:id/academic-years', () => {
    it('should allow school_admin to create academic year', async () => {
      stubAuth(schoolAdmin)

      // Mock the service's createAcademicYear to avoid complex DocumentArray mocking
      const schoolService = require('../../src/modules/schools/services/schoolService')
      const originalFn = schoolService.createAcademicYear
      schoolService.createAcademicYear = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        label: '2025-2026',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2026-06-30'),
        isCurrent: false,
      })

      const AuditLog = mongoose.model('AuditLog')
      ;(AuditLog.create as jest.Mock).mockResolvedValue({})

      const res = await request(app)
        .post(`/api/schools/${schoolId1}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
        .set('X-School-Id', schoolId1)
        .send({
          label: '2025-2026',
          startDate: '2025-08-01',
          endDate: '2026-06-30',
          isCurrent: false,
        })

      expect(res.status).toBe(201)

      // Restore
      schoolService.createAcademicYear = originalFn
    })

    it('should reject teacher from creating academic year', async () => {
      stubAuth(teacher)

      const res = await request(app)
        .post(`/api/schools/${schoolId1}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(teacher)}`)
        .set('X-School-Id', schoolId1)
        .send({
          label: '2025-2026',
          startDate: '2025-08-01',
          endDate: '2026-06-30',
        })

      expect(res.status).toBe(403)
    })

    it('should reject invalid date range', async () => {
      stubAuth(schoolAdmin)

      const res = await request(app)
        .post(`/api/schools/${schoolId1}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
        .set('X-School-Id', schoolId1)
        .send({
          label: '2025-2026',
          startDate: '2026-06-30',
          endDate: '2025-08-01',
        })

      expect(res.status).toBe(400)
    })

    it('should write audit log on academic year creation', async () => {
      stubAuth(schoolAdmin)

      const schoolService = require('../../src/modules/schools/services/schoolService')
      const originalFn = schoolService.createAcademicYear
      schoolService.createAcademicYear = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        label: '2025-2026',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2026-06-30'),
        isCurrent: true,
      })

      const AuditLog = mongoose.model('AuditLog')
      ;(AuditLog.create as jest.Mock).mockResolvedValue({})

      await request(app)
        .post(`/api/schools/${schoolId1}/academic-years`)
        .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
        .set('X-School-Id', schoolId1)
        .send({
          label: '2025-2026',
          startDate: '2025-08-01',
          endDate: '2026-06-30',
          isCurrent: true,
        })

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'academic_year:create',
          entity: 'AcademicYear',
        }),
      )

      schoolService.createAcademicYear = originalFn
    })
  })
})
