import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import {
  createDisciplineRecordSchema,
  updateDisciplineRecordSchema,
  addFollowUpSchema,
  listDisciplineQuerySchema,
} from '../schemas/disciplineSchemas.js'
import * as disciplineService from '../services/disciplineService.js'
import mongoose from 'mongoose'

const router = Router()

// ── Create discipline record ─────────────────────────────────────────

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('discipline:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createDisciplineRecordSchema.parse(req.body)
      const record = await disciplineService.createDisciplineRecord(
        req.tenantId!,
        req.user!.id,
        parsed,
      )
      res.status(201).json(record)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create discipline record'
      res.status(400).json({ error: message })
    }
  },
)

// ── List discipline records ──────────────────────────────────────────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('discipline:read'),
  async (req: Request, res: Response) => {
    try {
      const parsed = listDisciplineQuerySchema.parse(req.query)
      const result = await disciplineService.listDisciplineRecords(
        req.tenantId!,
        req.user!.id,
        req.user!.roles,
        parsed,
      )
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list discipline records'
      res.status(403).json({ error: message })
    }
  },
)

// ── Get discipline record by ID ──────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('discipline:read'),
  async (req: Request, res: Response) => {
    try {
      const record = await disciplineService.getDisciplineRecordById(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
      )
      if (!record) {
        res.status(404).json({ error: 'Discipline record not found' })
        return
      }
      res.json(record)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get discipline record'
      res.status(400).json({ error: message })
    }
  },
)

// ── Update discipline record ─────────────────────────────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('discipline:update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateDisciplineRecordSchema.parse(req.body)
      const record = await disciplineService.updateDisciplineRecord(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
        parsed,
      )
      res.json(record)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update discipline record'
      res.status(400).json({ error: message })
    }
  },
)

// ── Add follow-up note ───────────────────────────────────────────────

router.post(
  '/:id/follow-up',
  authenticate,
  resolveTenant,
  requirePermission('discipline:update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = addFollowUpSchema.parse(req.body)
      const record = await disciplineService.addFollowUp(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
        parsed.note,
      )
      res.json(record)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add follow-up'
      res.status(400).json({ error: message })
    }
  },
)

export default router
