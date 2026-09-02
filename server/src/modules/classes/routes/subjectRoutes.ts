import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { validate } from '../../../middlewares/validation/validate.js'
import { createSubjectSchema, updateSubjectSchema } from '../schemas/classSchemas.js'
import * as classService from '../services/classService.js'

const router = Router()

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('subject:create'),
  validate(createSubjectSchema),
  async (req: Request, res: Response) => {
    try {
      const subject = await classService.createSubject(req.tenantId!, req.body, req.user!._id.toString())
      res.status(201).json(subject)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create subject'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('subject:list'),
  async (req: Request, res: Response) => {
    try {
      const subjects = await classService.listSubjects(req.tenantId!)
      res.json(subjects)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list subjects'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('subject:read'),
  async (req: Request, res: Response) => {
    try {
      const subjectId = String(req.params.id)
      const subject = await classService.getSubjectById(req.tenantId!, subjectId)
      if (!subject) {
        res.status(404).json({ error: 'Subject not found' })
        return
      }
      res.json(subject)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get subject'
      res.status(500).json({ error: message })
    }
  },
)

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('subject:update'),
  validate(updateSubjectSchema),
  async (req: Request, res: Response) => {
    try {
      const subjectId = String(req.params.id)
      const subject = await classService.updateSubject(req.tenantId!, subjectId, req.body, req.user!._id.toString())
      res.json(subject)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update subject'
      res.status(400).json({ error: message })
    }
  },
)

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('subject:delete'),
  async (req: Request, res: Response) => {
    try {
      const subjectId = String(req.params.id)
      await classService.deleteSubject(req.tenantId!, subjectId, req.user!._id.toString())
      res.json({ message: 'Subject deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete subject'
      res.status(400).json({ error: message })
    }
  },
)

export default router
