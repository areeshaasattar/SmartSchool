import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { createSlotSchema, updateSlotSchema, availabilityQuerySchema } from '../schemas/timetableSchemas.js'
import * as timetableService from '../services/timetableService.js'
import mongoose from 'mongoose'

const router = Router()

// ── POST /timetable/slots — create slot ──────────────────────────────

router.post(
  '/slots',
  authenticate,
  resolveTenant,
  requirePermission('timetable:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createSlotSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const slot = await timetableService.createSlot(tenantId, parsed, userId, req.user!.email)
      res.status(201).json(slot)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create slot'
      const status = message.includes('conflict') ? 409 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── PATCH /timetable/slots/:id — update slot ─────────────────────────

router.patch(
  '/slots/:id',
  authenticate,
  resolveTenant,
  requirePermission('timetable:update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateSlotSchema.parse(req.body)
      const tenantId = req.tenantId!
      const slotId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const slot = await timetableService.updateSlot(tenantId, slotId, parsed, userId, req.user!.email)
      res.json(slot)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update slot'
      const status = message.includes('conflict') ? 409 : message.includes('not found') ? 404 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── DELETE /timetable/slots/:id — delete slot ────────────────────────

router.delete(
  '/slots/:id',
  authenticate,
  resolveTenant,
  requirePermission('timetable:delete'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const slotId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      await timetableService.deleteSlot(tenantId, slotId, userId, req.user!.email)
      res.json({ message: 'Slot deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete slot'
      const status = message.includes('not found') ? 404 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── GET /timetable/class/:classId — class weekly schedule ────────────

router.get(
  '/class/:classId',
  authenticate,
  resolveTenant,
  requirePermission('timetable:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const classId = String(req.params.classId)
      const slots = await timetableService.getClassTimetable(tenantId, classId)
      res.json(slots)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch class timetable'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /timetable/teacher/:teacherId — teacher schedule ─────────────

router.get(
  '/teacher/:teacherId',
  authenticate,
  resolveTenant,
  requirePermission('timetable:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacherId = String(req.params.teacherId)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      // Teachers can only view their own schedule
      if (req.user!.roles.includes('teacher') && !req.user!.roles.includes('school_admin')) {
        const Teacher = mongoose.model('Teacher')
        const teacher = await Teacher.findOne({ userId, schoolId: tenantId })
        if (!teacher || teacher._id.toString() !== teacherId) {
          res.status(403).json({ error: 'You can only view your own schedule' })
          return
        }
      }

      const slots = await timetableService.getTeacherTimetable(tenantId, teacherId)
      res.json(slots)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch teacher timetable'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /timetable/room/:roomId — room utilization ───────────────────

router.get(
  '/room/:roomId',
  authenticate,
  resolveTenant,
  requirePermission('timetable:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const roomId = String(req.params.roomId)
      const slots = await timetableService.getRoomTimetable(tenantId, roomId)
      res.json(slots)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch room timetable'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /timetable/availability — live conflict check ────────────────

router.get(
  '/availability',
  authenticate,
  resolveTenant,
  requirePermission('timetable:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const parsed = availabilityQuerySchema.parse(req.query)

      // Get current academic year from school
      const School = mongoose.model('School')
      const school = await School.findById(tenantId)
      const currentYear = school?.academicYears?.find((y: { isCurrent: boolean }) => y.isCurrent)
      if (!currentYear) {
        res.status(400).json({ error: 'No current academic year found' })
        return
      }

      const result = await timetableService.checkAvailability(tenantId, currentYear._id.toString(), {
        teacherId: parsed.teacherId,
        roomId: parsed.roomId,
        classId: parsed.classId,
        day: parsed.day,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      })
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to check availability'
      res.status(400).json({ error: message })
    }
  },
)

export default router
