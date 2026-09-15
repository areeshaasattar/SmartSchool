import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { validate } from '../../../middlewares/validation/validate.js'
import { authRateLimit, passwordResetRateLimit } from '../../../middlewares/validation/rateLimit.js'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../schemas/authSchemas.js'
import * as authService from '../services/authService.js'

const router = Router()

// POST /auth/register
router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body
      const result = await authService.register(
        { email, password, firstName, lastName, phone },
        req.headers['user-agent'],
        req.ip,
      )

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: result.user._id,
          email: result.user.email,
          roles: result.user.roles,
          profile: result.user.profile,
          status: result.user.status,
          schoolIds: result.user.schoolIds,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email already registered') {
          res.status(409).json({ error: error.message })
          return
        }
      }
      throw error
    }
  },
)

// POST /auth/login
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body
      const result = await authService.login(
        { email, password },
        req.headers['user-agent'],
        req.ip,
      )

      res.json({
        message: 'Login successful',
        user: {
          id: result.user._id,
          email: result.user.email,
          roles: result.user.roles,
          profile: result.user.profile,
          status: result.user.status,
          schoolIds: result.user.schoolIds,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Invalid email or password' ||
          error.message === 'Please verify your email before logging in' ||
          error.message === 'Account has been disabled'
        ) {
          res.status(401).json({ error: error.message })
          return
        }
      }
      throw error
    }
  },
)

// POST /auth/refresh
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    const result = await authService.refresh(refreshToken)

    res.json({
      accessToken: result.accessToken,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'Invalid refresh token' ||
        error.message === 'Refresh token expired' ||
        error.message === 'User not found or inactive'
      ) {
        res.status(401).json({ error: error.message })
        return
      }
    }
    throw error
  }
})

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await authService.logout(refreshToken)
    }
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    throw error
  }
})

// POST /auth/verify-email
router.post('/verify-email', validate(verifyEmailSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    await authService.verifyEmail(token)
    res.json({ message: 'Email verified successfully' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid or expired verification token') {
        res.status(400).json({ error: error.message })
        return
      }
    }
    throw error
  }
})

// POST /auth/resend-verification
router.post(
  '/resend-verification',
  authRateLimit,
  validate(resendVerificationSchema),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      await authService.resendVerification(email)
      res.json({ message: 'If your email is registered, a verification link has been sent.' })
    } catch (error) {
      throw error
    }
  },
)

// POST /auth/password-reset/request
router.post(
  '/password-reset/request',
  passwordResetRateLimit,
  validate(passwordResetRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body
      await authService.requestPasswordReset(email)
      res.json({ message: 'If your email is registered, a password reset link has been sent.' })
    } catch (error) {
      throw error
    }
  },
)

// POST /auth/password-reset/confirm
router.post(
  '/password-reset/confirm',
  validate(passwordResetConfirmSchema),
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body
      await authService.confirmPasswordReset(token, password)
      res.json({ message: 'Password reset successful' })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid or expired reset token') {
          res.status(400).json({ error: error.message })
          return
        }
      }
      throw error
    }
  },
)

// GET /auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        roles: req.user.roles,
        profile: req.user.profile,
        status: req.user.status,
        schoolIds: req.user.schoolIds,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
    })
  } catch (error) {
    throw error
  }
})

export default router
