import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import * as analyticsService from '../services/analyticsService.js'

const router = Router()

// ── School Admin Overview ────────────────────────────────────────────

router.get(
  '/school-admin/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:school_admin'),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getSchoolAdminOverview(req.tenantId!)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

// ── Principal Overview ───────────────────────────────────────────────

router.get(
  '/principal/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:principal'),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getPrincipalOverview(req.tenantId!)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

// ── Teacher Overview ─────────────────────────────────────────────────

router.get(
  '/teacher/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:teacher'),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getTeacherOverview(req.tenantId!, req.user!.id)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

// ── Accountant Overview ──────────────────────────────────────────────

router.get(
  '/accountant/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:accountant'),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getAccountantOverview(req.tenantId!)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

// ── Student Overview ─────────────────────────────────────────────────

router.get(
  '/student/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:student'),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getStudentOverview(req.tenantId!, req.user!.id)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

// ── Parent Overview ──────────────────────────────────────────────────

router.get(
  '/parent/overview',
  authenticate,
  resolveTenant,
  requirePermission('analytics:parent'),
  async (req: Request, res: Response) => {
    try {
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined
      const data = await analyticsService.getParentOverview(req.tenantId!, req.user!.id, studentId)
      res.json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load overview'
      res.status(400).json({ error: message })
    }
  },
)

export default router
