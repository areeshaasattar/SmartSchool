import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import {
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  listLeaveQuerySchema,
} from '../schemas/leaveSchemas.js'
import * as leaveService from '../services/leaveService.js'
import mongoose from 'mongoose'

const router = Router()

// ── Create leave request ─────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const parsed = createLeaveRequestSchema.parse(req.body)
      const leave = await leaveService.createLeaveRequest(
        req.tenantId!,
        req.user!.id,
        parsed,
      )
      res.status(201).json(leave)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create leave request'
      res.status(400).json({ error: message })
    }
  },
)

// ── List leave requests ──────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('leave:read'),
  async (req: Request, res: Response) => {
    try {
      const parsed = listLeaveQuerySchema.parse(req.query)
      const result = await leaveService.listLeaveRequests(
        req.tenantId!,
        req.user!.id,
        req.user!.roles,
        parsed,
      )
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list leave requests'
      res.status(400).json({ error: message })
    }
  },
)

// ── Get leave request by ID ──────────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const leave = await leaveService.getLeaveRequestById(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
      )
      if (!leave) {
        res.status(404).json({ error: 'Leave request not found' })
        return
      }
      res.json(leave)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get leave request'
      res.status(400).json({ error: message })
    }
  },
)

// ── Review leave request (approve/reject) ────────────────────────────

router.post(
  '/:id/review',
  authenticate,
  resolveTenant,
  requirePermission('leave:review'),
  async (req: Request, res: Response) => {
    try {
      const parsed = reviewLeaveRequestSchema.parse(req.body)
      const leave = await leaveService.reviewLeaveRequest(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
        parsed,
      )
      res.json(leave)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to review leave request'
      res.status(400).json({ error: message })
    }
  },
)

// ── Cancel leave request ─────────────────────────────────────────────

router.post(
  '/:id/cancel',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const leave = await leaveService.cancelLeaveRequest(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
      )
      res.json(leave)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel leave request'
      res.status(400).json({ error: message })
    }
  },
)

export default router
