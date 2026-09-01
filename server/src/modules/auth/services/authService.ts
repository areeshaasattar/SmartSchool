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

  // Create session with refresh token
  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshTokenExpiry()

  await Session.create({
    userId: user._id,
    refreshToken,
    userAgent,
    ipAddress,
    expiresAt,
  })

  // Generate access token
  const accessTokenPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
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
  // Find user
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (!user) {
    throw new Error('Invalid email or password')
  }

  // Check password
  const isPasswordValid = await comparePassword(input.password, user.passwordHash)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  // Check account status
  if (user.status === 'pending_verification') {
    throw new Error('Please verify your email before logging in')
  }
  if (user.status === 'disabled') {
    throw new Error('Account has been disabled')
  }

  // Update last login
  user.lastLogin = new Date()
  await user.save()

  // Create session with refresh token
  const refreshToken = generateRefreshToken()
  const expiresAt = getRefreshTokenExpiry()

  await Session.create({
    userId: user._id,
    refreshToken,
    userAgent,
    ipAddress,
    expiresAt,
  })

  // Generate access token
  const accessTokenPayload: AccessTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles,
  }
  const accessToken = generateAccessToken(accessTokenPayload)

  return { user, accessToken, refreshToken }
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  // Find session
  const session = await Session.findOne({ refreshToken })
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
  }
  const accessToken = generateAccessToken(accessTokenPayload)

  return { accessToken }
}

export async function logout(refreshToken: string): Promise<void> {
  await Session.deleteOne({ refreshToken })
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
  await sendEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
  })
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
  await user.save()

  // Invalidate all sessions
  await Session.deleteMany({ userId: user._id })
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await User.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}
