import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7

export interface AccessTokenPayload {
  userId: string
  email: string
  roles: string[]
  /** Unix seconds — bump on password change/logout-all so old JWTs die immediately. */
  tokenVersion?: number
  /** Unix seconds of password change baked into the token at issue time. */
  pwdChangedAt?: number
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')

  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')

  return jwt.verify(token, secret) as AccessTokenPayload
}

export function generateRefreshToken(): string {
  return randomUUID()
}

export function getRefreshTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)
  return expiry
}

// ── Immediate access-token invalidation after password change ─────────

/**
 * Check a decoded access-token payload against the user's current auth state.
 *
 * Returns false (token must be rejected) when:
 *  - the token's tokenVersion is older than the user's current tokenVersion, or
 *  - the token predates the most recent password change (pwdChangedAt claim
 *    compared against user.passwordChangedAt).
 *
 * Tokens issued before this feature (no claims) are treated as issued at time 0
 * and only fail if the user has since changed their password / bumped version.
 */
export function isAccessTokenStale(
  payload: AccessTokenPayload,
  user: { tokenVersion?: number; passwordChangedAt?: Date },
): boolean {
  const userVersion = user.tokenVersion ?? 0
  const tokenVersion = payload.tokenVersion ?? 0
  if (tokenVersion < userVersion) return true

  const changedAt = user.passwordChangedAt
    ? Math.floor(user.passwordChangedAt.getTime() / 1000)
    : 0
  const tokenPwdAt = payload.pwdChangedAt ?? 0
  // Tokens minted BEFORE the change (pwdChangedAt claim < change time) are stale.
  if (tokenPwdAt < changedAt) return true

  return false
}
