import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../../src/modules/auth/schemas/authSchemas'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const data = {
        email: 'test@example.com',
        password: 'StrongPass1',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'StrongPass1',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject weak password (no uppercase)', () => {
      const data = {
        email: 'test@example.com',
        password: 'weakpassword1',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject weak password (no number)', () => {
      const data = {
        email: 'test@example.com',
        password: 'WeakPassword',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'Ab1',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept optional phone', () => {
      const data = {
        email: 'test@example.com',
        password: 'StrongPass1',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty password', () => {
      const data = {
        email: 'test@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('refreshSchema', () => {
    it('should accept valid UUID', () => {
      const data = {
        refreshToken: '550e8400-e29b-41d4-a716-446655440000',
      }

      const result = refreshSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const data = {
        refreshToken: 'not-a-uuid',
      }

      const result = refreshSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('verifyEmailSchema', () => {
    it('should accept valid token', () => {
      const data = {
        token: 'valid-token-123',
      }

      const result = verifyEmailSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty token', () => {
      const data = {
        token: '',
      }

      const result = verifyEmailSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('passwordResetRequestSchema', () => {
    it('should accept valid email', () => {
      const data = {
        email: 'test@example.com',
      }

      const result = passwordResetRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('passwordResetConfirmSchema', () => {
    it('should accept valid data', () => {
      const data = {
        token: 'valid-token',
        password: 'NewPass123',
      }

      const result = passwordResetConfirmSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject weak password', () => {
      const data = {
        token: 'valid-token',
        password: 'weak',
      }

      const result = passwordResetConfirmSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})
