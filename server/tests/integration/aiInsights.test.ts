import request from 'supertest'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { generateAccessToken } from '../../src/shared/tokens'

/* eslint-disable @typescript-eslint/no-explicit-any */
type M = any

/**
 * Chain-aware mongoose mock: every model gets find/findOne/findById that return
 * a thenable query chain (select/sort/skip/limit/populate). Tests then override
 * specific methods with their own mockResolvedValue / mockImplementation.
 */
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')

  const mkChain = () => {
    const chain: any = {}
    for (const method of ['select', 'sort', 'skip', 'limit', 'populate']) {
      chain[method] = jest.fn(() => chain)
    }
    chain.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve([]).then(onFulfilled, onRejected)
    return chain
  }

  const mkModel = () => ({
    findById: jest.fn(() => mkChain()),
    findOne: jest.fn(() => mkChain()),
    find: jest.fn(() => mkChain()),
    create: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
  })

  const models: Record<string, unknown> = {}
  return {
    ...actualMongoose,
    model: jest.fn((name: string) => (models[name] ??= mkModel())),
    Schema: actualMongoose.Schema,
    Types: actualMongoose.Types,
  }
})

// Mock the AI service client — no real HTTP calls in tests.
const mockSummarizeInsight = jest.fn()
jest.mock('../../src/modules/ai/services/aiServiceClient', () => ({
  summarizeInsight: (...args: unknown[]) => mockSummarizeInsight(...args),
  processAIRequest: jest.fn(),
  indexKnowledgeDocument: jest.fn(),
  deindexKnowledgeDocument: jest.fn(),
  AIServiceClientError: class AIServiceClientError extends Error {
    constructor(message: string, public readonly statusCode = 502) {
      super(message)
    }
  },
}))

// Silence side-effectful dependencies reached via routes/index.
jest.mock('../../src/modules/notifications/services/notificationService', () => ({
  dispatchNotification: jest.fn(),
}))
jest.mock('../../src/queues/index', () => ({
  attendanceAlertsQueue: { add: jest.fn() },
}))

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV = 'test'

import routes from '../../src/routes/index'
import { Types } from 'mongoose'

const School = mongoose.model('School') as unknown as { findById: M; findOne: M }
const User = mongoose.model('User') as unknown as { findById: M }
const Teacher = mongoose.model('Teacher') as unknown as { findOne: M }
const AIInsight = mongoose.model('AIInsight') as unknown as {
  create: M
  find: M
  findOneAndUpdate: M
  countDocuments: M
}
const AIQueryLog = mongoose.model('AIQueryLog') as unknown as { create: M }

let app: express.Application

beforeAll(() => {
  app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api', routes)
})

// ── Helpers ──────────────────────────────────────────────────────────

const schoolA = new Types.ObjectId().toString()
const schoolB = new Types.ObjectId().toString()

function makeToken(user: { id: string; email: string; roles: string[] }) {
  return generateAccessToken({ userId: user.id, email: user.email, roles: user.roles })
}

function stubAuth(user: { id: string; email: string; roles: string[]; schoolIds?: string[] }) {
  ;(User.findById as M).mockResolvedValue({
    _id: user.id,
    email: user.email,
    roles: user.roles,
    schoolIds: (user.schoolIds || []).map((s) => new Types.ObjectId(s)),
    profile: { firstName: 'Test', lastName: 'User' },
    status: 'active',
  })
}

/** A thenable query chain that resolves to `value` — for models whose code calls .select()/.sort() before awaiting. */
function chainOf(value: unknown): M {
  const chain: M = {}
  for (const method of ['select', 'sort', 'skip', 'limit', 'populate']) chain[method] = jest.fn(() => chain)
  chain.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(onFulfilled, onRejected)
  return chain
}

const principalA = {
  id: new Types.ObjectId().toString(),
  email: 'principal.a@example.com',
  roles: ['principal'],
  schoolIds: [schoolA],
}
const principalB = {
  id: new Types.ObjectId().toString(),
  email: 'principal.b@example.com',
  roles: ['principal'],
  schoolIds: [schoolB],
}
const teacherA = {
  id: new Types.ObjectId().toString(),
  email: 'teacher.a@example.com',
  roles: ['teacher'],
  schoolIds: [schoolA],
}
const studentA = {
  id: new Types.ObjectId().toString(),
  email: 'student.a@example.com',
  roles: ['student'],
  schoolIds: [schoolA],
}
const superAdmin = {
  id: new Types.ObjectId().toString(),
  email: 'super@example.com',
  roles: ['super_admin'],
  schoolIds: [] as string[],
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: aggregate path reaches the AI service and persists fine.
  mockSummarizeInsight.mockResolvedValue({
    insightType: 'academic',
    result: { narrative: 'Stable performance across classes.', keyPoints: [], caveats: [] },
    status: 'ok',
  })
  ;(AIInsight.create as M).mockImplementation(async (data: Record<string, unknown>) => ({
    ...data,
    _id: new Types.ObjectId(),
  }))
  ;(AIQueryLog.create as M).mockResolvedValue({})
  ;(School.findById as M).mockImplementation(() => chainOf({ settings: { attendanceAlertThreshold: 75 } }))
  ;(AIInsight.findOneAndUpdate as M).mockResolvedValue({ _id: 'x', status: 'acknowledged' })
  ;(Teacher.findOne as M).mockImplementation(() => chainOf(null))
})

// ── RBAC on generate endpoints ───────────────────────────────────────

describe('AI Insights RBAC', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/ai/insights/academic').send({})
    expect(res.status).toBe(401)
  })

  it('rejects student from generating academic insights', async () => {
    stubAuth(studentA)
    const res = await request(app)
      .post('/api/ai/insights/academic')
      .set('Authorization', `Bearer ${makeToken(studentA)}`)
      .set('X-School-Id', schoolA)
      .send({})
    expect(res.status).toBe(403)
  })

  it('rejects teacher from generating principal briefing', async () => {
    stubAuth(teacherA)
    const res = await request(app)
      .post('/api/ai/insights/principal-briefing')
      .set('Authorization', `Bearer ${makeToken(teacherA)}`)
      .set('X-School-Id', schoolA)
      .send({})
    expect(res.status).toBe(403)
  })

  it('rejects accountant from listing insights', async () => {
    stubAuth({ ...studentA, roles: ['accountant'], email: 'acc@example.com' })
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${makeToken(studentA)}`)
      .set('X-School-Id', schoolA)
    expect(res.status).toBe(403)
  })

  it('allows principal to generate academic insight and logs with feature=insight', async () => {
    stubAuth(principalA)
    const res = await request(app)
      .post('/api/ai/insights/academic')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolA)
      .send({})
    expect(res.status).toBe(201)
    expect(mockSummarizeInsight).toHaveBeenCalledTimes(1)
    expect(AIQueryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'insight', requestType: 'insight_academic' }),
    )
  })

  it('allows super_admin to generate briefing for an explicit tenant', async () => {
    stubAuth(superAdmin)
    const res = await request(app)
      .post('/api/ai/insights/principal-briefing')
      .set('Authorization', `Bearer ${makeToken(superAdmin)}`)
      .set('X-School-Id', schoolA)
      .send({})
    expect(res.status).toBe(201)
  })
})

// ── Tenant isolation ─────────────────────────────────────────────────

describe('AI Insights tenant isolation', () => {
  it("rejects School A's principal using School B's tenant header", async () => {
    stubAuth(principalA)
    const res = await request(app)
      .post('/api/ai/insights/academic')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolB)
      .send({})
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Access denied')
  })

  it('requires X-School-Id header for tenant-scoped insight routes', async () => {
    stubAuth(principalA)
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Tenant')
  })

  it('acknowledge only resolves insights within the tenant', async () => {
    stubAuth(principalA)
    ;(AIInsight.findOneAndUpdate as M).mockResolvedValue(null) // tenant-filtered update matches nothing

    const res = await request(app)
      .post(`/api/ai/insights/${new Types.ObjectId().toString()}/acknowledge`)
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolA)

    expect(res.status).toBe(404)
    // The update filter must include the tenant schoolId.
    expect(AIInsight.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: expect.anything() }),
      expect.anything(),
      expect.anything(),
    )
  })
})

// ── Teacher class scoping ────────────────────────────────────────────

describe('Teacher-scoped insights', () => {
  it('passes the teacher class scope through to the aggregate builder', async () => {
    stubAuth(teacherA)
    const classId = new Types.ObjectId().toString()
    ;(Teacher.findOne as M).mockImplementation(() =>
      chainOf({ _id: new Types.ObjectId(), classes: [new Types.ObjectId(classId)] }),
    )

    const res = await request(app)
      .post('/api/ai/insights/academic')
      .set('Authorization', `Bearer ${makeToken(teacherA)}`)
      .set('X-School-Id', schoolA)
      .send({})

    expect(res.status).toBe(201)
    const call = mockSummarizeInsight.mock.calls[0][0]
    expect(call.insightType).toBe('academic')
    expect(call.aggregateData.period).toEqual({ weeks: 8 })
    expect(call.schoolContext.scopeDescription).toContain('assigned class')
  })

  it('allows teacher to list academic insights but not briefing type', async () => {
    stubAuth(teacherA)
    ;(AIInsight.countDocuments as M).mockResolvedValue(0)
    const chain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    }
    ;(AIInsight.find as M).mockReturnValue(chain)

    const ok = await request(app)
      .get('/api/ai/insights?type=academic')
      .set('Authorization', `Bearer ${makeToken(teacherA)}`)
      .set('X-School-Id', schoolA)
    expect(ok.status).toBe(200)

    const denied = await request(app)
      .get('/api/ai/insights?type=briefing')
      .set('Authorization', `Bearer ${makeToken(teacherA)}`)
      .set('X-School-Id', schoolA)
    expect(denied.status).toBe(403)
  })

  it("does not let School B's teacher read insights via School A's tenant", async () => {
    stubAuth(principalB)
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${makeToken(principalB)}`)
      .set('X-School-Id', schoolA)
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('Access denied')
  })
})

// ── PII guard: aggregate never contains raw student identifiers ──────

describe('Aggregate PII guard', () => {
  const FORBIDDEN = [
    'studentId',
    'studentIds',
    'admissionNo',
    'firstName',
    'lastName',
    'email',
    'phone',
    'profile',
    'guardianId',
    'parentId',
    'employeeNo',
    'remarks',
    'content',
    'feedback',
    'name',
  ]

  it('sends no raw student identifier fields in the academic aggregate', async () => {
    stubAuth(principalA)
    const res = await request(app)
      .post('/api/ai/insights/academic')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolA)
      .send({ weeks: 4 })

    expect(res.status).toBe(201)
    const aggregate = mockSummarizeInsight.mock.calls[0][0].aggregateData
    const serialized = JSON.stringify(aggregate)
    for (const field of FORBIDDEN) {
      expect(serialized).not.toContain(`"${field}"`)
    }
    expect(mockSummarizeInsight).toHaveBeenCalledTimes(1)
  })

  it('sends no raw student identifier fields in the attendance aggregate', async () => {
    stubAuth(principalA)
    const res = await request(app)
      .post('/api/ai/insights/attendance')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolA)
      .send({})

    expect(res.status).toBe(201)
    const aggregate = mockSummarizeInsight.mock.calls[0][0].aggregateData
    const serialized = JSON.stringify(aggregate)
    for (const field of FORBIDDEN) {
      expect(serialized).not.toContain(`"${field}"`)
    }
  })

  it('refuses to call the AI service when an identifier field appears in the aggregate', async () => {
    stubAuth(principalA)

    // Drive the guardrail directly through the module under test.
    const { assertNoRawStudentIdentifiers } = await import(
      '../../src/modules/ai/insights/services/insightAggregates'
    )

    expect(() =>
      assertNoRawStudentIdentifiers({ classAverages: [{ classLabel: '5-A', studentId: 'leak' }] }),
    ).toThrow(/forbidden identifier field/)

    // And a clean aggregate passes.
    expect(() =>
      assertNoRawStudentIdentifiers({ classAverages: [{ classLabel: '5-A', avgPercentage: 71 }] }),
    ).not.toThrow()

    // The route-level flow never invoked the AI service with identifier fields.
    const res = await request(app)
      .post('/api/ai/insights/principal-briefing')
      .set('Authorization', `Bearer ${makeToken(principalA)}`)
      .set('X-School-Id', schoolA)
      .send({})
    expect(res.status).toBe(201)
    const serialized = JSON.stringify(mockSummarizeInsight.mock.calls.at(-1)?.[0].aggregateData ?? {})
    for (const field of FORBIDDEN) {
      expect(serialized).not.toContain(`"${field}"`)
    }
  })
})
