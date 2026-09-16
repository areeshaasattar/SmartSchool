import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../../shared/redis.js'

/**
 * Per-account login lockout with exponential backoff.
 *
 * Separate from the IP-based auth rate limit: an attacker rotating IPs (or a
 * shared NAT) still hits this because the counter is keyed by the target
 * account (email), not the source address.
 *
 * Redis keys:
 *   lockout:fail:<email>   — consecutive failure count (TTL = window)
 *   lockout:until:<email>  — epoch ms until which login is refused
 *
 * Backoff schedule by consecutive failures (N):
 *   N < 5            no lock
 *   N = 5            1 minute
 *   N = 6            2 minutes
 *   N = 7            4 minutes   … doubling, capped at LOCKOUT_MAX_MS.
 *
 * On successful login the failure counter resets.
 */

export const LOCKOUT_THRESHOLD = 5
export const LOCKOUT_BASE_MS = 60_000 // 1 minute
export const LOCKOUT_MAX_MS = 30 * 60_000 // 30 minutes
export const LOCKOUT_WINDOW_SECONDS = 15 * 60 // failure counter TTL

function lockKey(email: string): string {
  return `lockout:until:${email.toLowerCase()}`
}

function failKey(email: string): string {
  return `lockout:fail:${email.toLowerCase()}`
}

export async function getFailedAttempts(email: string): Promise<number> {
  const redis = getRedisClient()
  const raw = await redis.get(failKey(email))
  return raw ? parseInt(raw, 10) : 0
}

export async function getLockUntil(email: string): Promise<number> {
  const redis = getRedisClient()
  const raw = await redis.get(lockKey(email))
  return raw ? parseInt(raw, 10) : 0
}

/** Compute the backoff duration for a given failure count. */
export function backoffFor(attemptNumber: number): number {
  if (attemptNumber < LOCKOUT_THRESHOLD) return 0
  const exp = attemptNumber - LOCKOUT_THRESHOLD // 0-based
  const ms = LOCKOUT_BASE_MS * 2 ** exp
  return Math.min(ms, LOCKOUT_MAX_MS)
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const redis = getRedisClient()
  const count = await redis.incr(failKey(email))
  if (count === 1) {
    await redis.expire(failKey(email), LOCKOUT_WINDOW_SECONDS)
  }
  const backoff = backoffFor(count)
  if (backoff > 0) {
    await redis.set(lockKey(email), String(Date.now() + backoff), 'EX', Math.ceil(backoff / 1000))
  }
}

export async function clearFailures(email: string): Promise<void> {
  const redis = getRedisClient()
  await redis.del(failKey(email))
  await redis.del(lockKey(email))
}

/**
 * Express middleware for POST /auth/login.
 *
 * Runs BEFORE password verification. If the account is locked, responds 423
 * (Locked) with retryAfter; the auth route never reaches bcrypt for locked
 * accounts, preventing timing/password-oracle probing during the lock.
 */
export async function loginLockout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : ''
    if (!email) {
      next()
      return
    }

    const lockUntil = await getLockUntil(email)
    const now = Date.now()
    if (lockUntil > now) {
      const retryAfter = Math.ceil((lockUntil - now) / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      res.status(423).json({
        error: 'Account temporarily locked due to repeated failed logins',
        retryAfter,
      })
      return
    }

    next()
  } catch (error) {
    // Redis down → fail open rather than lock everyone out, like rateLimit.ts
    console.error('Lockout check error:', error)
    next()
  }
}

/** Called by authService.login on a failed password. */
export async function notifyLoginFailure(email: string): Promise<void> {
  try {
    await recordFailedAttempt(email)
  } catch (error) {
    console.error('Lockout record error:', error)
  }
}

/** Called by authService.login on success. */
export async function notifyLoginSuccess(email: string): Promise<void> {
  try {
    await clearFailures(email)
  } catch (error) {
    console.error('Lockout clear error:', error)
  }
}
