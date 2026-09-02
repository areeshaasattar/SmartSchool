import { Request, Response, NextFunction } from 'express'

/**
 * Resolve the active tenant (schoolId) from the request.
 *
 * Reads the `X-School-Id` header, verifies the authenticated user
 * belongs to that school, and attaches `req.tenantId` for downstream use.
 *
 * `super_admin` users bypass the tenant check — they can access any school
 * or no school (platform-level routes).
 */
export function resolveTenant(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' })
      return
    }

    const isSuperAdmin = req.user.roles.includes('super_admin')
    const schoolIdHeader = req.headers['x-school-id'] as string | undefined

    // Super admins can omit the tenant header for platform-level routes
    if (isSuperAdmin && !schoolIdHeader) {
      return next()
    }

    if (!schoolIdHeader) {
      res.status(403).json({ error: 'Tenant (X-School-Id header) is required' })
      return
    }

    // Validate ObjectId format (24-char hex string)
    if (!/^[0-9a-fA-F]{24}$/.test(schoolIdHeader)) {
      res.status(400).json({ error: 'Invalid X-School-Id format' })
      return
    }

    // Cross-check against user's assigned schools
    const userSchoolIds = (req.user.schoolIds || []).map((id) => id.toString())

    if (!isSuperAdmin && !userSchoolIds.includes(schoolIdHeader)) {
      res.status(403).json({ error: 'Access denied: you do not belong to this school' })
      return
    }

    req.tenantId = schoolIdHeader
    next()
  } catch (error) {
    next(error)
  }
}

// Extend Express Request to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string
    }
  }
}
