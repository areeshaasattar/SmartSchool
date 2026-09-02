import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import * as portalService from '../services/portalService.js'
import mongoose from 'mongoose'

const router = Router()

// ── GET /parent-portal/dashboard — aggregated dashboard ──────────────

router.get(
  '/dashboard',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined

      if (!studentId) {
        res.status(400).json({ error: 'studentId query parameter is required' })
        return
      }

      const dashboard = await portalService.getDashboard(userId, tenantId, studentId)
      res.json(dashboard)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      const status = message.includes('Access denied') ? 403 : message.includes('not found') ? 404 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── GET /parent-portal/children — list parent's children ─────────────

router.get(
  '/children',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const children = await portalService.getMyChildren(userId, tenantId)
      res.json({ children })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load children'
      res.status(500).json({ error: message })
    }
  },
)

export default router
