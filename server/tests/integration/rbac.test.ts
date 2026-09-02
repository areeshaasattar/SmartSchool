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
    find: jest.fn(),
    create: jest.fn(),
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

// ── Helpers ──────────────────────────────────────────────────────────

function makeToken(user: { id: string; email: string; roles: string[] }) {
  return generateAccessToken({
    userId: user.id,
    email: user.email,
    roles: user.roles,
  })
}

/** Stub User.findById so authenticate() passes. */
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

// ── School creation ──────────────────────────────────────────────────

describe('POST /api/schools', () => {
  it('should allow super_admin to create a school', async () => {
    stubAuth(superAdmin)

    const School = mongoose.model('School')
    ;(School.findOne as jest.Mock).mockResolvedValue(null)
    ;(School.create as jest.Mock).mockResolvedValue({
      _id: schoolId1,
      name: 'Test School',
      code: 'TST01',
      status: 'active',
      createdAt: new Date(),
    })

    const res = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .send({ name: 'Test School', code: 'TST01' })

    expect(res.status).toBe(201)
    expect(res.body.school.name).toBe('Test School')
  })

  it('should reject school_admin from creating a school', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .send({ name: 'Unauthorized School', code: 'UNX01' })

    expect(res.status).toBe(403)
  })

  it('should reject teacher from creating a school', async () => {
    stubAuth(teacher)

    const res = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${makeToken(teacher)}`)
      .send({ name: 'Unauthorized School', code: 'UNX02' })

    expect(res.status).toBe(403)
  })

  it('should reject request without auth token', async () => {
    const res = await request(app)
      .post('/api/schools')
      .send({ name: 'No Auth School', code: 'NA01' })

    expect(res.status).toBe(401)
  })

  it('should reject duplicate school code', async () => {
    stubAuth(superAdmin)

    const School = mongoose.model('School')
    ;(School.findOne as jest.Mock).mockResolvedValue({ _id: schoolId1, code: 'DUP01' })

    const res = await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .send({ name: 'Duplicate School', code: 'DUP01' })

    expect(res.status).toBe(409)
  })
})

// ── School listing ───────────────────────────────────────────────────

describe('GET /api/schools', () => {
  it('should allow super_admin to list schools', async () => {
    stubAuth(superAdmin)

    const School = mongoose.model('School')
    ;(School.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: schoolId1, name: 'School A', code: 'SCA', status: 'active',
          settings: {}, subscription: {}, academicYears: [], createdAt: new Date(),
        },
      ]),
    })

    const res = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)

    expect(res.status).toBe(200)
    expect(res.body.schools).toHaveLength(1)
  })

  it('should reject non-super_admin from listing schools', async () => {
    stubAuth(schoolAdmin)

    const res = await request(app)
      .get('/api/schools')
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)

    expect(res.status).toBe(403)
  })
})

// ── Tenant isolation ─────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it('should reject teacher from School A accessing School B', async () => {
    stubAuth(teacher)

    const User = mongoose.model('User')
    ;(User.find as jest.Mock).mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    })
    ;(User.countDocuments as jest.Mock).mockResolvedValue(0)

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(teacher)}`)
      .set('X-School-Id', schoolId2)

    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Access denied')
  })

  it('should require X-School-Id header for tenant-scoped routes', async () => {
    stubAuth(teacher)

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(teacher)}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Tenant')
  })

  it('should allow super_admin to access any school', async () => {
    stubAuth({ ...superAdmin, schoolIds: [] })

    const User = mongoose.model('User')
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    }
    ;(User.find as jest.Mock).mockReturnValue(mockChain)
    ;(User.countDocuments as jest.Mock).mockResolvedValue(0)

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .set('X-School-Id', schoolId2)

    expect(res.status).toBe(200)
  })
})

// ── Role assignment ──────────────────────────────────────────────────

describe('POST /api/users/:id/roles', () => {
  it('should allow school_admin to assign role within their tenant', async () => {
    stubAuth(schoolAdmin)

    const User = mongoose.model('User')
    const targetUserId = new mongoose.Types.ObjectId().toString()
    const mockTargetUser = {
      _id: targetUserId,
      email: 'target@example.com',
      roles: ['teacher'],
      schoolIds: [new mongoose.Types.ObjectId(schoolId1)],
      save: jest.fn().mockResolvedValue(true),
    }
    ;(User.findById as jest.Mock).mockImplementation((id: string) => {
      // First call is for auth (schoolAdmin), subsequent calls for target user lookup
      if (id === schoolAdmin.id) {
        return Promise.resolve({
          _id: schoolAdmin.id,
          email: schoolAdmin.email,
          roles: schoolAdmin.roles,
          schoolIds: schoolAdmin.schoolIds.map((s) => new mongoose.Types.ObjectId(s)),
          profile: { firstName: 'School', lastName: 'Admin' },
          status: 'active',
        })
      }
      return Promise.resolve(mockTargetUser)
    })

    const res = await request(app)
      .post(`/api/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ role: 'school_admin', schoolId: schoolId1 })

    expect(res.status).toBe(200)
    expect(mockTargetUser.save).toHaveBeenCalled()
  })

  it('should reject role assignment outside tenant', async () => {
    stubAuth(schoolAdmin)

    const targetUserId = new mongoose.Types.ObjectId().toString()

    const res = await request(app)
      .post(`/api/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ role: 'teacher', schoolId: schoolId2 })

    expect(res.status).toBe(403)
  })

  it('should prevent assigning super_admin via this endpoint', async () => {
    stubAuth(schoolAdmin)

    const User = mongoose.model('User')
    const targetUserId = new mongoose.Types.ObjectId().toString()
    ;(User.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === schoolAdmin.id) {
        return Promise.resolve({
          _id: schoolAdmin.id,
          email: schoolAdmin.email,
          roles: schoolAdmin.roles,
          schoolIds: schoolAdmin.schoolIds.map((s) => new mongoose.Types.ObjectId(s)),
          profile: { firstName: 'School', lastName: 'Admin' },
          status: 'active',
        })
      }
      return Promise.resolve({
        _id: targetUserId,
        roles: ['teacher'],
        schoolIds: [new mongoose.Types.ObjectId(schoolId1)],
      })
    })

    const res = await request(app)
      .post(`/api/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ role: 'super_admin', schoolId: schoolId1 })

    expect(res.status).toBe(403)
  })

  it('should prevent teacher from assigning roles', async () => {
    stubAuth(teacher)

    const targetUserId = new mongoose.Types.ObjectId().toString()

    const res = await request(app)
      .post(`/api/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${makeToken(teacher)}`)
      .set('X-School-Id', schoolId1)
      .send({ role: 'teacher', schoolId: schoolId1 })

    expect(res.status).toBe(403)
  })
})

// ── Audit logging ────────────────────────────────────────────────────

describe('Audit logging', () => {
  it('should write an audit log on school creation', async () => {
    stubAuth(superAdmin)

    const School = mongoose.model('School')
    const AuditLog = mongoose.model('AuditLog')
    ;(School.findOne as jest.Mock).mockResolvedValue(null)
    ;(School.create as jest.Mock).mockResolvedValue({
      _id: schoolId1,
      name: 'Audited School',
      code: 'AUD01',
      status: 'active',
      createdAt: new Date(),
    })
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    await request(app)
      .post('/api/schools')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .send({ name: 'Audited School', code: 'AUD01' })

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'school:create',
        entity: 'School',
        actorEmail: superAdmin.email,
      }),
    )
  })

  it('should write an audit log on role assignment', async () => {
    const User = mongoose.model('User')
    const AuditLog = mongoose.model('AuditLog')
    const targetUserId = new mongoose.Types.ObjectId().toString()
    const mockTargetUser = {
      _id: targetUserId,
      roles: ['teacher'],
      schoolIds: [new mongoose.Types.ObjectId(schoolId1)],
      save: jest.fn().mockResolvedValue(true),
    }

    ;(User.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === schoolAdmin.id) {
        return Promise.resolve({
          _id: schoolAdmin.id,
          email: schoolAdmin.email,
          roles: schoolAdmin.roles,
          schoolIds: schoolAdmin.schoolIds.map((s) => new mongoose.Types.ObjectId(s)),
          profile: { firstName: 'School', lastName: 'Admin' },
          status: 'active',
        })
      }
      return Promise.resolve(mockTargetUser)
    })
    ;(AuditLog.create as jest.Mock).mockResolvedValue({})

    await request(app)
      .post(`/api/users/${targetUserId}/roles`)
      .set('Authorization', `Bearer ${makeToken(schoolAdmin)}`)
      .set('X-School-Id', schoolId1)
      .send({ role: 'school_admin', schoolId: schoolId1 })

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user:assign_role',
        entity: 'User',
        entityId: targetUserId,
        actorEmail: schoolAdmin.email,
      }),
    )
  })
})
