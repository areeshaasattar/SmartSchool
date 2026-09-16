import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../../shared/redis.js'

interface RateLimitOptions {
  windowSeconds: number
  maxRequests: number
  keyPrefix?: string
}

export function rateLimit(options: RateLimitOptions) {
  const { windowSeconds, maxRequests, keyPrefix = 'rl' } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient()
      const ip = req.ip || req.socket.remoteAddress || 'unknown'
      const key = `${keyPrefix}:${ip}:${req.path}`

      const current = await redis.incr(key)

      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      const ttl = await redis.ttl(key)

      res.setHeader('X-RateLimit-Limit', maxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString())
      res.setHeader('X-RateLimit-Reset', ttl.toString())

      if (current > maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
          retryAfter: ttl,
        })
        return
      }

      next()
    } catch (error) {
      // If Redis is unavailable, allow the request through
      console.error('Rate limit error:', error)
      next()
    }
  }
}

export const authRateLimit = rateLimit({
  windowSeconds: 15 * 60, // 15 minutes
  maxRequests: 10,
  keyPrefix: 'rl:auth',
})

/**
 * Per-USER limiter for expensive AI endpoints (assistant query, insights,
 * quiz generation). Keyed by authenticated user id + tenant, NOT IP — a
 * shared office NAT must not let one heavy user starve everyone else.
 * Must be mounted AFTER `authenticate`.
 */
export function userRateLimit(options: { windowSeconds: number; maxRequests: number; keyPrefix: string }) {
  const { windowSeconds, maxRequests, keyPrefix } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient()
      const userId = req.user?._id?.toString() || req.ip || 'anonymous'
      const tenant = req.tenantId || 'none'
      const key = `${keyPrefix}:${tenant}:${userId}`

      const current = await redis.incr(key)
      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      const ttl = await redis.ttl(key)
      res.setHeader('X-RateLimit-Limit', maxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString())
      res.setHeader('X-RateLimit-Reset', ttl.toString())

      if (current > maxRequests) {
        res.setHeader('Retry-After', String(ttl))
        res.status(429).json({
          error: 'Too many AI requests — please wait before trying again',
          retryAfter: ttl,
        })
        return
      }

      next()
    } catch (error) {
      // Redis unavailable → fail open, consistent with the IP limiter above
      console.error('User rate limit error:', error)
      next()
    }
  }
}

/** AI assistant/insights: 20 requests per user per 5 minutes. */
export const aiUserRateLimit = userRateLimit({
  windowSeconds: 5 * 60,
  maxRequests: 20,
  keyPrefix: 'rl:ai-user',
})

export const passwordResetRateLimit = rateLimit({
  windowSeconds: 60 * 60, // 1 hour
  maxRequests: 5,
  keyPrefix: 'rl:pwdreset',
})
