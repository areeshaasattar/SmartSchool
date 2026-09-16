import request from 'supertest'
import express from 'express'
import cors from 'cors'
import { hashPassword } from '../../src/shared/password'

// Mock mongoose before importing routes
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')
  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  }
  const mockSessionModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  }
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    model: jest.fn((name: string) => {
      if (name === 'User') return mockUserModel
      if (name === 'Session') return mockSessionModel
      return {}
    }),
    Schema: actualMongoose.Schema,
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

// Mock email
jest.mock('../../src/shared/email/sendEmail', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  buildVerificationEmail: jest.fn().mockReturnValue({
    subject: 'Verify Email',
    html: '<p>Verify</p>',
  }),
  buildPasswordResetEmail: jest.fn().mockReturnValue({
    subject: 'Reset Password',
    html: '<p>Reset</p>',
  }),
}))

process.env.JWT_SECRET = 'test-secret-key'
process.env.NODE_ENV = 'test'

import routes from '../../src/routes/index'
import mongoose from 'mongoose'

let app: express.Application
let hashedPassword: string

beforeAll(async () => {
  hashedPassword = await hashPassword('StrongPass1')

  app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/api', routes)
})

describe('Auth Endpoints', () => {
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    passwordHash: '', // Set in beforeAll
    roles: ['teacher'],
    schoolIds: [],
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
    status: 'active',
    lastLogin: null,
    emailVerificationToken: undefined,
    emailVerificationExpires: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    save: jest.fn().mockResolvedValue(true),
  }

  beforeAll(() => {
    mockUser.passwordHash = hashedPassword
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(null)
      ;(User.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'pending_verification',
      })

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        })

      expect(res.status).toBe(201)
      expect(res.body.message).toContain('Registration successful')
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it('should reject duplicate email', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        })

      expect(res.status).toBe(409)
    })

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid',
          password: 'StrongPass1',
          firstName: 'John',
          lastName: 'Doe',
        })

      expect(res.status).toBe(400)
    })

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'active',
      })

      const Session = mongoose.model('Session')
      ;(Session.create as jest.Mock).mockResolvedValue({})

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongPass1',
        })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it('should reject invalid password', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword1',
        })

      expect(res.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password',
        })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      const validRefreshToken = '550e8400-e29b-41d4-a716-446655440000'

      const Session = mongoose.model('Session')
      ;(Session.findOne as jest.Mock).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        userId: mockUser._id,
        refreshToken: validRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      const User = mongoose.model('User')
      ;(User.findById as jest.Mock).mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
    })

    it('should reject invalid refresh token', async () => {
      const Session = mongoose.model('Session')
      ;(Session.findOne as jest.Mock).mockResolvedValue(null)

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '550e8400-e29b-41d4-a716-446655440000' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const Session = mongoose.model('Session')
      ;(Session.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 })

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: '11111111-2222-4333-8444-555555555555' })

      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = require('../../src/shared/tokens').generateAccessToken({
        userId: mockUser._id.toString(),
        email: mockUser.email,
        roles: mockUser.roles,
      })

      const User = mongoose.model('User')
      ;(User.findById as jest.Mock).mockResolvedValue(mockUser)

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.user.email).toBe(mockUser.email)
    })

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/auth/me')

      expect(res.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/password-reset/request', () => {
    it('should request password reset', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(mockUser)

      const res = await request(app)
        .post('/api/auth/password-reset/request')
        .send({ email: 'test@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('reset link')
    })
  })

  describe('POST /api/auth/password-reset/confirm', () => {
    it('should reset password with valid token', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordResetToken: 'valid-reset-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      })

      const Session = mongoose.model('Session')
      ;(Session.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 })

      const res = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token: 'valid-reset-token', password: 'NewPass123' })

      expect(res.status).toBe(200)
      expect(res.body.message).toContain('Password reset successful')
    })

    it('should reject invalid reset token', async () => {
      const User = mongoose.model('User')
      ;(User.findOne as jest.Mock).mockResolvedValue(null)

      const res = await request(app)
        .post('/api/auth/password-reset/confirm')
        .send({ token: 'invalid-token', password: 'NewPass123' })

      expect(res.status).toBe(400)
    })
  })
})
