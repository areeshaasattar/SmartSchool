import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  AccessTokenPayload,
} from '../../src/shared/tokens'

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing'

describe('Token Utilities', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload: AccessTokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['teacher'],
      }

      const token = generateAccessToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload: AccessTokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['teacher'],
      }

      const token = generateAccessToken(payload)
      const verified = verifyAccessToken(token)

      expect(verified.userId).toBe(payload.userId)
      expect(verified.email).toBe(payload.email)
      expect(verified.roles).toEqual(payload.roles)
    })

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow()
    })

    it('should throw for token with wrong secret', () => {
      const payload: AccessTokenPayload = {
        userId: 'user123',
        email: 'test@example.com',
        roles: ['teacher'],
      }

      const token = generateAccessToken(payload)

      // Change secret temporarily
      const originalSecret = process.env.JWT_SECRET
      process.env.JWT_SECRET = 'different-secret'

      expect(() => verifyAccessToken(token)).toThrow()

      process.env.JWT_SECRET = originalSecret
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a UUID refresh token', () => {
      const token = generateRefreshToken()

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })

    it('should generate unique tokens', () => {
      const token1 = generateRefreshToken()
      const token2 = generateRefreshToken()

      expect(token1).not.toBe(token2)
    })
  })

  describe('getRefreshTokenExpiry', () => {
    it('should return a date 7 days in the future', () => {
      const expiry = getRefreshTokenExpiry()
      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      // Allow 1 second tolerance
      expect(expiry.getTime()).toBeGreaterThan(now.getTime())
      expect(expiry.getTime()).toBeLessThanOrEqual(sevenDaysFromNow.getTime() + 1000)
    })
  })
})
