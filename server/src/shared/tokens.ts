import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_DAYS = 7

export interface AccessTokenPayload {
  userId: string
  email: string
  roles: string[]
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
