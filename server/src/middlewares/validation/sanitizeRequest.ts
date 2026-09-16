/**
 * NoSQL injection sanitization for Express 5.
 *
 * express-mongo-sanitize's stock middleware reassigns `req.query`, which is a
 * getter-only property in Express 5 and throws at runtime. This wrapper uses
 * the library's exported `sanitize()` helper and writes results back without
 * reassigning the getter properties:
 *   - req.body  — own writable property, safe to reassign
 *   - req.query — sanitize a copy, then shadow the getter via defineProperty
 *   - req.params — own writable property, safe to reassign
 */
import type { Request, Response, NextFunction } from 'express'
// The package's CommonJS export shape: { default?: middleware, sanitize, has }
import ems from 'express-mongo-sanitize'

const sanitize = (ems as unknown as { sanitize: (payload: unknown) => unknown }).sanitize

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body)
    }

    if (req.query && typeof req.query === 'object') {
      const clean = sanitize(req.query) as Record<string, unknown>
      Object.defineProperty(req, 'query', {
        value: clean,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitize(req.params) as typeof req.params
    }

    next()
  } catch (error) {
    next(error)
  }
}
