import { Request, Response, NextFunction } from 'express'
import { hasPermission } from './policy.js'

/**
 * Require that the authenticated user holds at least one of the specified roles.
 *
 * Usage:  router.get('/admin', authenticate, requireRole('super_admin'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const userRoles = req.user.roles.map((r) => r as string)
    const allowed = userRoles.some((role) => roles.includes(role))

    if (!allowed) {
      res.status(403).json({
        error: 'Forbidden',
        message: `One of the following roles is required: ${roles.join(', ')}`,
      })
      return
    }

    next()
  }
}

/**
 * Require that the authenticated user has a specific permission.
 * Uses the role → permission policy defined in `policy.ts`.
 *
 * Usage:  router.post('/users/:id/roles', authenticate, resolveTenant, requirePermission('user:assign_role'), handler)
 */
export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const userRoles = req.user.roles.map((r) => r as string)

    if (!hasPermission(userRoles, action)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Permission denied: ${action}`,
      })
      return
    }

    next()
  }
}
