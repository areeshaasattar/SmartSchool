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

export const passwordResetRateLimit = rateLimit({
  windowSeconds: 60 * 60, // 1 hour
  maxRequests: 5,
  keyPrefix: 'rl:pwdreset',
})
