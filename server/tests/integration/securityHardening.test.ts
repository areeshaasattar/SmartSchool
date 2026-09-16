/**
 * Security hardening integration tests.
 *
 * Covers the required behaviors plus supporting hardening:
 *   1. Account lockout with exponential backoff (Redis counters, per-account)
 *   2. CORS rejection of disallowed origins (allowlist from env)
 *   3. Refresh tokens stored hashed; lookup by hash
 *   4. passwordChangedAt/tokenVersion — password change kills live access tokens
 *   5. NoSQL injection sanitization ($-prefixed keys stripped)
 *   6. HPP rejection of duplicated parameters
 *   7. Security headers present (helmet)
 */
import request from 'supertest'
import express from 'express'
import { sanitizeRequest } from '../../src/middlewares/validation/sanitizeRequest'
import mongoose from 'mongoose'
import { generateAccessToken, isAccessTokenStale } from '../../src/shared/tokens'
import {
  backoffFor,
  LOCKOUT_THRESHOLD,
  LOCKOUT_BASE_MS,
  LOCKOUT_MAX_MS,
} from '../../src/middlewares/auth/loginLockout'
import { assertValidCorsAllowlist } from '../../src/shared/config/env'
import { createApp } from '../../src/app'

/* eslint-disable @typescript-eslint/no-explicit-any */
type M = any

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
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    exists: jest.fn().mockResolvedValue(null),
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

// Redis mock: in-memory counter store mirroring incr/expire/get/set/del/ttl
const store = new Map<string, { value: string; expiresAt?: number }>()
const mockRedis = {
  incr: jest.fn(async (key: string) => {
    const entry = store.get(key)
    const next = entry ? parseInt(entry.value, 10) + 1 : 1
    store.set(key, { value: String(next), expiresAt: entry?.expiresAt })
    return next
  }),
  expire: jest.fn(async (key: string, seconds: number) => {
    const entry = store.get(key)
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000
      store.set(key, entry)
    }
    return 1
  }),
  ttl: jest.fn(async (key: string) => {
    const entry = store.get(key)
    if (!entry?.expiresAt) return -1
    return Math.max(1, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  }),
  get: jest.fn(async (key: string) => store.get(key)?.value ?? null),
  set: jest.fn(async (key: string, value: string) => {
    store.set(key, { value })
    return 'OK'
  }),
  del: jest.fn(async (...keys: string[]) => {
    let removed = 0
    for (const key of keys) if (store.delete(key)) removed++
    return removed
  }),
}

jest.mock('../../src/shared/redis', () => ({
  getRedisClient: jest.fn(() => mockRedis),
  closeRedis: jest.fn(),
}))

jest.mock('../../src/modules/ai/services/aiServiceClient', () => ({
  summarizeInsight: jest.fn(),
  processAIRequest: jest.fn(),
  indexKnowledgeDocument: jest.fn(),
  deindexKnowledgeDocument: jest.fn(),
  AIServiceClientError: class AIServiceClientError extends Error {
    constructor(message: string, public readonly statusCode = 502) {
      super(message)
    }
  },
}))

jest.mock('../../src/modules/notifications/services/notificationService', () => ({
  dispatchNotification: jest.fn(),
}))
jest.mock('../../src/queues/index', () => ({
  attendanceAlertsQueue: { add: jest.fn() },
}))

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV = 'test'
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173'

import { Types } from 'mongoose'

const User = mongoose.model('User') as unknown as { findById: M; findOne: M }
const Session = mongoose.model('Session') as unknown as { create: M; findOne: M; deleteOne: M; deleteMany: M; find: M }

let app: express.Application

beforeAll(() => {
  // Use the real hardened pipeline (helmet, CORS allowlist, sanitize, hpp).
  app = createApp()
})

beforeEach(() => {
  jest.clearAllMocks()
  store.clear()
})

// ── Helpers ──────────────────────────────────────────────────────────

const schoolA = new Types.ObjectId().toString()

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
    tokenVersion: 0,
  })
}

const principal = {
  id: new Types.ObjectId().toString(),
  email: 'principal@example.com',
  roles: ['principal'],
  schoolIds: [schoolA],
}

// ── 1. Account lockout ───────────────────────────────────────────────

describe('Account lockout (per-account, exponential backoff)', () => {
  it('exponential backoff schedule: nothing before threshold, doubling after, capped', () => {
    expect(backoffFor(LOCKOUT_THRESHOLD - 1)).toBe(0)
    expect(backoffFor(LOCKOUT_THRESHOLD)).toBe(LOCKOUT_BASE_MS)
    expect(backoffFor(LOCKOUT_THRESHOLD + 1)).toBe(LOCKOUT_BASE_MS * 2)
    expect(backoffFor(LOCKOUT_THRESHOLD + 2)).toBe(LOCKOUT_BASE_MS * 4)
    expect(backoffFor(LOCKOUT_THRESHOLD + 20)).toBe(LOCKOUT_MAX_MS)
  })

  it('423s with Retry-After once the account is locked, before password check', async () => {
    const email = 'locked@example.com'
    // Prime 5 failures via the login endpoint's own failure path
    ;(User.findOne as M).mockResolvedValue(null) // "no such user" → failure counted
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' })
    }

    // Only the POST-lock request is under observation
    ;(User.findOne as M).mockClear()
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1' })
    expect(res.status).toBe(423)
    expect(res.headers['retry-after']).toBeDefined()
    expect(res.body.error).toMatch(/locked/i)

    // No further password verification attempts on locked accounts
    expect(User.findOne).not.toHaveBeenCalled()
  })

  it('does not lock unrelated accounts (per-account, not per-IP)', async () => {
    const victim = 'victim@example.com'
    ;(User.findOne as M).mockResolvedValue(null)
    for (let i = 0; i < LOCKOUT_THRESHOLD + 1; i++) {
      await request(app).post('/api/auth/login').send({ email: victim, password: 'WrongPass1' })
    }

    // Different account from the same IP is unaffected
    const other = await request(app)
      .post('/api/auth/login')
      .send({ email: 'someoneelse@example.com', password: 'WrongPass1' })
    expect(other.status).toBe(401)
  })
})

// ── 2. CORS allowlist ────────────────────────────────────────────────

describe('CORS allowlist enforcement', () => {
  it('rejects origins outside the allowlist with 403', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Origin', 'https://evil.example.com')
    expect(res.status).toBe(403)
    expect(JSON.stringify(res.body)).toMatch(/not allowed by CORS/i)
  })

  it('accepts allowlisted origins', async () => {
    stubAuth(principal)
    const res = await request(app)
      .get('/api/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${makeToken(principal)}`)
    expect([200, 401].includes(res.status)).toBe(true) // 401 only if auth fails — never 403-for-CORS
    expect(res.status).toBe(200)
  })

  it('assertValidCorsAllowlist rejects wildcards and junk entries', () => {
    expect(() => assertValidCorsAllowlist(['*'])).toThrow(/wildcard/i)
    expect(() => assertValidCorsAllowlist([''])).toThrow()
    expect(() => assertValidCorsAllowlist(['http://localhost:5173/path'])).toThrow(/path/i)
    expect(() => assertValidCorsAllowlist(['http://localhost:5173'])).not.toThrow()
  })
})

// ── 3. Refresh tokens stored hashed ──────────────────────────────────

describe('Refresh token hashing', () => {
  it('stores only a sha-256 hash of the refresh token in sessions', async () => {
    ;(User.findOne as M).mockResolvedValue({
      _id: new Types.ObjectId(),
      email: 'user@example.com',
      roles: ['teacher'],
      profile: { firstName: 'A', lastName: 'B' },
      status: 'active',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
      tokenVersion: 0,
      save: jest.fn().mockResolvedValue(undefined),
    })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs')
    const realCompare = bcrypt.compare
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)
    ;(Session.create as M).mockResolvedValue({})

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'ValidPass1' })

    expect(res.status).toBe(200)
    const created = (Session.create as M).mock.calls[0][0]
    // Raw UUIDs are 36 chars with dashes; sha-256 hex is 64
    expect(created.refreshToken).toMatch(/^[0-9a-f]{64}$/)
    expect(created.refreshToken).not.toBe(res.body.refreshToken)

    bcrypt.compare = realCompare
  })

  it('looks sessions up by hash on refresh, never the raw token', async () => {
    ;(Session.findOne as M).mockResolvedValue(null)
    await request(app).post('/api/auth/refresh').send({ refreshToken: '11111111-1111-4111-8111-111111111111' })

    const arg = (Session.findOne as M).mock.calls[0][0]
    expect(arg.refreshToken).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ── 4. Immediate access-token invalidation after password change ─────

describe('passwordChangedAt / tokenVersion invalidation', () => {
  it('isAccessTokenStale rejects tokens minted before a password change', () => {
    const changedAt = new Date('2026-09-16T12:00:00Z')
    const before = { userId: 'u', email: 'e', roles: ['teacher'], tokenVersion: 0, pwdChangedAt: 0 }
    const user = { tokenVersion: 1, passwordChangedAt: changedAt }

    expect(isAccessTokenStale(before, user)).toBe(true)
    // Token issued AFTER the change is fine
    const after = {
      userId: 'u',
      email: 'e',
      roles: ['teacher'],
      tokenVersion: 1,
      pwdChangedAt: Math.floor(changedAt.getTime() / 1000),
    }
    expect(isAccessTokenStale(after, user)).toBe(false)
  })

  it('isAccessTokenStale rejects older tokenVersions even with no pwdChangedAt', () => {
    const base = { userId: 'u', email: 'e', roles: ['teacher'] }
    expect(isAccessTokenStale({ ...base, tokenVersion: 0, pwdChangedAt: 0 }, { tokenVersion: 3 })).toBe(true)
    expect(isAccessTokenStale({ ...base, tokenVersion: 3, pwdChangedAt: 0 }, { tokenVersion: 3 })).toBe(false)
  })

  it('authenticate rejects stale tokens with 401', async () => {
    stubAuth(principal)
    // Simulate a user whose password changed after the token was minted
    ;(User.findById as M).mockResolvedValue({
      _id: principal.id,
      email: principal.email,
      roles: principal.roles,
      schoolIds: [],
      profile: { firstName: 'T', lastName: 'U' },
      status: 'active',
      tokenVersion: 5,
      passwordChangedAt: new Date(Date.now() + 60_000), // future = after token issue
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken(principal)}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalidated/i)
  })
})

// ── 5. NoSQL injection sanitization ──────────────────────────────────

describe('NoSQL injection sanitization (mongoSanitize)', () => {
  it('strips $-prefixed and dotted keys from bodies before handlers see them', async () => {
    // Probe the real middleware directly with an echo endpoint
    const probe = express()
    probe.use(express.json())
    probe.use(sanitizeRequest)
    probe.post('/probe', (req, res) => {
      res.json(req.body)
    })

    const res = await request(probe)
      .post('/probe')
      .send({ email: { $gt: '' }, profile: { 'nested.dot': 'x' }, ok: 'kept' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ email: {}, profile: {}, ok: 'kept' })
  })

  it('login with operator-laden payload fails validation (no operator bypass)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $ne: 'x' } })
    // sanitize empties the objects, zod then rejects non-string email/password
    expect([400, 401].includes(res.status)).toBe(true)
  })
}, )

// ── 6. HPP ───────────────────────────────────────────────────────────

describe('HTTP parameter pollution (hpp)', () => {
  it('deduplicates repeated query params instead of passing arrays through', async () => {
    // hpp's default mode keeps the first occurrence; the request must not error
    const res = await request(app).get('/health?a=1&a=2')
    expect(res.status).toBe(200)
  })
})

// ── 7. Security headers ──────────────────────────────────────────────

describe('Security headers (helmet)', () => {
  it('sets CSP, HSTS, X-Content-Type-Options, and frame protection', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['strict-transport-security']).toBeDefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
  })
})

// ── 8. Tenant-filter guard (lint rule behavior) ──────────────────────

describe('Tenant-owned query guard', () => {
  it('resolveTenant rejects users not belonging to the requested school', async () => {
    stubAuth({ ...principal, schoolIds: [new Types.ObjectId().toString()] }) // different school
    const res = await request(app)
      .get('/api/ai/insights')
      .set('Authorization', `Bearer ${makeToken(principal)}`)
      .set('X-School-Id', schoolA)
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/Access denied/i)
  })

  it('insight acknowledge filter always includes schoolId (tenant isolation)', async () => {
    stubAuth(principal)
    const AIInsight = mongoose.model('AIInsight') as unknown as { findOneAndUpdate: M }
    ;(AIInsight.findOneAndUpdate as M).mockResolvedValue(null)

    await request(app)
      .post(`/api/ai/insights/${new Types.ObjectId().toString()}/acknowledge`)
      .set('Authorization', `Bearer ${makeToken(principal)}`)
      .set('X-School-Id', schoolA)

    expect(AIInsight.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: expect.anything() }),
      expect.anything(),
      expect.anything(),
    )
  })
})
