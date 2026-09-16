import { User, IUser } from '../models/User.js'
import { Session } from '../models/Session.js'
import { hashPassword, comparePassword } from '../../../shared/password.js'
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  AccessTokenPayload,
} from '../../../shared/tokens.js'
import {
  notifyLoginFailure,
  notifyLoginSuccess,
} from '../../../middlewares/auth/loginLockout.js'
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from '../../../shared/emailVerification.js'
import {
  sendEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
} from '../../../shared/email/sendEmail.js'
import { RegisterInput, LoginInput } from '../schemas/authSchemas.js'

interface AuthResult {
  user: IUser
  accessToken: string
  refreshToken: string
}

// ── Refresh token hashing ────────────────────────────────────────────
/**
 * Refresh tokens are stored HASHED (sha-256) — a database dump must not yield
 * usable session tokens. Lookup is by hash; the raw token only ever exists in
 * the HTTP response and in the caller's memory.
 *
 * LEGACY MIGRATION NOTE: sessions created before this change stored the raw
 * UUID in `refreshToken`. `migrateLegacySessions()` re-hashes those rows on
 * first boot after deploy; it is idempotent and safe to remove afterwards.
 */
import { createHash } from 'crypto'

function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** One-time helper: re-hash any plaintext refresh tokens from before the migration. */
export async function migrateLegacySessions(): Promise<{ migrated: number }> {
  const legacy = await Session.find({
    refreshToken: { $regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
  })
  for (const session of legacy) {
    session.refreshToken = hashRefreshToken(session.refreshToken)
    await session.save()
  }
  return { migrated: legacy.length }
}

export async function register(
  input: RegisterInput,
  userAgent?: string,
  ipAddress?: string,
): Promise<AuthResult> {
  // Check if user already exists
  const existingUser = await User.findOne({ email: input.email.toLowerCase() })
  if (existingUser) {
    throw new Error('Email already registered')
  }

  // Hash password
  const passwordHash = await hashPassword(input.password)

  // Generate email verification token
  const { token: verificationToken, expires: verificationExpires } =
    generateEmailVerificationToken()

  // Create user
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    roles: ['teacher'],
    profile: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    },
    status: 'pending_verification',
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  })

  // Create session with refresh token (stored hashed)
  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshTokenExpiry()

  await Session.create({
    userId: user._id,
    refreshToken: hashRefreshToken(refreshToken),
    userAgent,
    ipAddress,
    expiresAt,
  })

  // Generate access token
  const accessTokenPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
    tokenVersion: 0,
    pwdChangedAt: 0,
  }
  const accessToken = generateAccessToken(accessTokenPayload)

  // Send verification email
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`
  const emailContent = buildVerificationEmail(verificationUrl)
  await sendEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
  })

  return { user, accessToken, refreshToken }
}

export async function login(
  input: LoginInput,
  userAgent?: string,
  ipAddress?: string,
): Promise<AuthResult> {
  // Find user (lockout middleware has already run in the route)
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (!user) {
    await notifyLoginFailure(input.email)
    throw new Error('Invalid email or password')
  }

  // Check password
  const isPasswordValid = await comparePassword(input.password, user.passwordHash)
  if (!isPasswordValid) {
    await notifyLoginFailure(input.email)
    throw new Error('Invalid email or password')
  }

  // Check account status
  if (user.status === 'pending_verification') {
    throw new Error('Please verify your email before logging in')
  }
  if (user.status === 'disabled') {
    throw new Error('Account has been disabled')
  }

  // Update last login + reset the failure counter
  user.lastLogin = new Date()
  await user.save()
  await notifyLoginSuccess(input.email)

  // Create session with refresh token (stored hashed)
  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshTokenExpiry()

  await Session.create({
    userId: user._id,
    refreshToken: hashRefreshToken(refreshToken),
    userAgent,
    ipAddress,
    expiresAt,
  })

  // Generate access token
  const accessTokenPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
    tokenVersion: user.tokenVersion ?? 0,
    pwdChangedAt: user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : 0,
  }
  const accessToken = generateAccessToken(accessTokenPayload)

  return { user, accessToken, refreshToken }
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  // Find session — lookup is by the HASHED value, never the raw token
  const session = await Session.findOne({ refreshToken: hashRefreshToken(refreshToken) })
  if (!session) {
    throw new Error('Invalid refresh token')
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id })
    throw new Error('Refresh token expired')
  }

  // Get user
  const user = await User.findById(session.userId)
  if (!user || user.status !== 'active') {
    await Session.deleteOne({ _id: session._id })
    throw new Error('User not found or inactive')
  }

  // Generate new access token
  const accessTokenPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
    tokenVersion: user.tokenVersion ?? 0,
    pwdChangedAt: user.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : 0,
  }
  const accessToken = generateAccessToken(accessTokenPayload)

  return { accessToken }
}

export async function logout(refreshToken: string): Promise<void> {
  await Session.deleteOne({ refreshToken: hashRefreshToken(refreshToken) })
}

export async function verifyEmail(token: string): Promise<void> {
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  })

  if (!user) {
    throw new Error('Invalid or expired verification token')
  }

  user.status = 'active'
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save()
}

export async function resendVerification(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    // Don't reveal if user exists
    return
  }

  if (user.status === 'active') {
    return
  }

  const { token, expires } = generateEmailVerificationToken()
  user.emailVerificationToken = token
  user.emailVerificationExpires = expires
  await user.save()

  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`
  const emailContent = buildVerificationEmail(verificationUrl)
  await sendEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user) {
    // Don't reveal if user exists
    return
  }

  const { token, expires } = generatePasswordResetToken()
  user.passwordResetToken = token
  user.passwordResetExpires = expires
  await user.save()

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`
  const emailContent = buildPasswordResetEmail(resetUrl)
  try {
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    })
  } catch (error) {
    // Token is already saved — log the delivery failure but don't fail the request
    // (also keeps the generic 'if your email is registered' response truthful).
    console.error('[passwordReset] Failed to send reset email:', error instanceof Error ? error.message : error)
  }
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  })

  if (!user) {
    throw new Error('Invalid or expired reset token')
  }

  user.passwordHash = await hashPassword(newPassword)
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  user.passwordChangedAt = new Date()
  user.tokenVersion = (user.tokenVersion ?? 0) + 1
  await user.save()

  // Invalidate all refresh sessions AND any access token minted before now
  // (authenticate() checks tokenVersion/passwordChangedAt on every request).
  await Session.deleteMany({ userId: user._id })
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await User.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}
