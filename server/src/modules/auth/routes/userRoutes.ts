import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { validate } from '../../../middlewares/validation/validate.js'
import { assignRoleSchema } from '../schemas/userSchemas.js'
import { User } from '../models/User.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import mongoose from 'mongoose'

const router = Router()

// POST /users/:id/roles — assign a role to a user within their tenant
router.post(
  '/:id/roles',
  authenticate,
  resolveTenant,
  requirePermission('user:assign_role'),
  validate(assignRoleSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const { role, schoolId } = req.body
      const tenantId = req.tenantId!
      const targetUserId = id as string

      // The schoolId in the body must match the resolved tenant
      if (schoolId !== tenantId) {
        res.status(403).json({ error: 'Cannot assign roles outside your current tenant' })
        return
      }

      // Validate target user ID format
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        res.status(400).json({ error: 'Invalid user ID format' })
        return
      }

      const targetUser = await User.findById(targetUserId)
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      // Verify the target user belongs to this school
      const targetSchoolIds = targetUser.schoolIds.map((sid) => sid.toString())
      if (!targetSchoolIds.includes(tenantId)) {
        res.status(403).json({ error: 'User does not belong to this school' })
        return
      }

      // Prevent privilege escalation: a user cannot grant a role they don't hold themselves
      const actorRoles = req.user!.roles.map((r) => r as string)
      if (!actorRoles.includes(role) && !actorRoles.includes('super_admin')) {
        res.status(403).json({
          error: 'Cannot grant a role you do not hold yourself',
        })
        return
      }

      // Prevent assigning super_admin via this endpoint
      if (role === 'super_admin') {
        res.status(403).json({ error: 'Cannot assign super_admin role via this endpoint' })
        return
      }

      // Capture before state for audit
      const beforeRoles = [...targetUser.roles]

      // Add role if not already present
      if (!targetUser.roles.includes(role as never)) {
        targetUser.roles.push(role as never)
        await targetUser.save()
      }

      // Audit log
      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'user:assign_role',
        entity: 'User',
        entityId: targetUserId,
        before: { roles: beforeRoles },
        after: { roles: targetUser.roles },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Role assigned successfully',
        user: {
          id: (targetUser._id as mongoose.Types.ObjectId).toString(),
          email: targetUser.email,
          roles: targetUser.roles,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// GET /users — list users in the resolved tenant (school_admin+)
router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('user:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '20') || 20, 100)
      const skip = (page - 1) * limit
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined

      const filter: Record<string, unknown> = {
        schoolIds: new mongoose.Types.ObjectId(tenantId),
        status: 'active',
      }

      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
        ]
      }

      if (roleFilter) {
        filter.roles = roleFilter
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('email roles profile status schoolIds createdAt')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments(filter),
      ])

      res.json({
        users: users.map((u) => ({
          id: (u._id as mongoose.Types.ObjectId).toString(),
          email: u.email,
          roles: u.roles,
          profile: u.profile,
          status: u.status,
          createdAt: u.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      throw error
    }
  },
)

export default router
