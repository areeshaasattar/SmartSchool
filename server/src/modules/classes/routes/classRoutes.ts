import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { validate } from '../../../middlewares/validation/validate.js'
import {
  createClassSchema,
  updateClassSchema,
  listClassesQuerySchema,
  enrollStudentSchema,
  unenrollStudentSchema,
  assignSubjectTeacherSchema,
  createRoomSchema,
} from '../schemas/classSchemas.js'
import * as classService from '../services/classService.js'

const router = Router()

// ── Rooms ────────────────────────────────────────────────────────────

router.post(
  '/rooms',
  authenticate,
  resolveTenant,
  requirePermission('class:create'),
  validate(createRoomSchema),
  async (req: Request, res: Response) => {
    try {
      const room = await classService.createRoom(req.tenantId!, req.body)
      res.status(201).json(room)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create room'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/rooms',
  authenticate,
  resolveTenant,
  requirePermission('class:list'),
  async (req: Request, res: Response) => {
    try {
      const rooms = await classService.listRooms(req.tenantId!)
      res.json(rooms)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list rooms'
      res.status(500).json({ error: message })
    }
  },
)

// ── Classes ──────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('class:create'),
  validate(createClassSchema),
  async (req: Request, res: Response) => {
    try {
      const cls = await classService.createClass(req.tenantId!, req.body, req.user!._id.toString())
      res.status(201).json(cls)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create class'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('class:list'),
  async (req: Request, res: Response) => {
    try {
      const parsed = listClassesQuerySchema.parse(req.query)
      const result = await classService.listClasses(req.tenantId!, parsed)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list classes'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('class:read'),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const cls = await classService.getClassById(req.tenantId!, classId)
      if (!cls) {
        res.status(404).json({ error: 'Class not found' })
        return
      }
      res.json(cls)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get class'
      res.status(500).json({ error: message })
    }
  },
)

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('class:update'),
  validate(updateClassSchema),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const cls = await classService.updateClass(req.tenantId!, classId, req.body, req.user!._id.toString())
      res.json(cls)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update class'
      res.status(400).json({ error: message })
    }
  },
)

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('class:delete'),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      await classService.deleteClass(req.tenantId!, classId, req.user!._id.toString())
      res.json({ message: 'Class deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete class'
      res.status(400).json({ error: message })
    }
  },
)

// ── Enrollment ───────────────────────────────────────────────────────

router.post(
  '/:id/enroll',
  authenticate,
  resolveTenant,
  requirePermission('class:update'),
  validate(enrollStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const student = await classService.enrollStudent(req.tenantId!, classId, req.body.studentId, req.user!._id.toString())
      res.json(student)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enroll student'
      res.status(400).json({ error: message })
    }
  },
)

router.post(
  '/:id/unenroll',
  authenticate,
  resolveTenant,
  requirePermission('class:update'),
  validate(unenrollStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const student = await classService.unenrollStudent(req.tenantId!, classId, req.body.studentId, req.user!._id.toString())
      res.json(student)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unenroll student'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/:id/roster',
  authenticate,
  resolveTenant,
  requirePermission('class:read'),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const result = await classService.getClassRoster(req.tenantId!, classId)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get roster'
      res.status(400).json({ error: message })
    }
  },
)

// ── Subject-Teacher Assignment ───────────────────────────────────────

router.post(
  '/:id/subjects',
  authenticate,
  resolveTenant,
  requirePermission('class:update'),
  validate(assignSubjectTeacherSchema),
  async (req: Request, res: Response) => {
    try {
      const classId = String(req.params.id)
      const cls = await classService.assignSubjectToClass(
        req.tenantId!,
        classId,
        req.body.subjectId,
        req.body.teacherId,
        req.user!._id.toString(),
      )
      res.json(cls)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign subject'
      res.status(400).json({ error: message })
    }
  },
)

export default router
