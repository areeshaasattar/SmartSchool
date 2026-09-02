import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import * as studentService from '../services/studentService.js'
import mongoose from 'mongoose'

const router = Router()

// ── GET /guardians/me/children — convenience alias ────────────────────

router.get(
  '/me/children',
  authenticate,
  resolveTenant,
  requirePermission('student:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const students = await studentService.getGuardianChildren(userId, tenantId)

      res.json({
        children: students.map((s) => ({
          id: (s._id as mongoose.Types.ObjectId).toString(),
          admissionNo: s.admissionNo,
          profile: s.profile,
          status: s.status,
          classId: s.classId,
          sectionId: s.sectionId,
        })),
      })
    } catch (error) {
      throw error
    }
  },
)

// ── GET /guardians/:id/children — parent views their own children ────

router.get(
  '/:id/children',
  authenticate,
  resolveTenant,
  requirePermission('student:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = String(req.params.id)

      // Parents can only view their own children
      if (req.user!.roles.includes('parent')) {
        const requestUserId = (req.user!._id as mongoose.Types.ObjectId).toString()
        if (userId !== requestUserId) {
          res.status(403).json({ error: 'Access denied: can only view your own children' })
          return
        }
      }

      const students = await studentService.getGuardianChildren(userId, tenantId)

      res.json({
        children: students.map((s) => ({
          id: (s._id as mongoose.Types.ObjectId).toString(),
          admissionNo: s.admissionNo,
          profile: s.profile,
          status: s.status,
          classId: s.classId,
          sectionId: s.sectionId,
        })),
      })
    } catch (error) {
      throw error
    }
  },
)

export default router
