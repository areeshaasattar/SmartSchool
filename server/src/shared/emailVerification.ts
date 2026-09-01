import crypto from 'crypto'

const TOKEN_LENGTH = 32
const EXPIRY_HOURS = 24

export function generateEmailVerificationToken(): { token: string; expires: Date } {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
  const expires = new Date()
  expires.setHours(expires.getHours() + EXPIRY_HOURS)
  return { token, expires }
}

export function generatePasswordResetToken(): { token: string; expires: Date } {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex')
  const expires = new Date()
  expires.setHours(expires.getHours() + 1)
  return { token, expires }
}
