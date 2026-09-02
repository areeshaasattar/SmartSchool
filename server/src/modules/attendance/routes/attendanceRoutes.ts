import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import {
  markAttendanceSchema,
  updateAttendanceSchema,
  classAttendanceQuerySchema,
  studentAttendanceQuerySchema,
  attendanceSummaryQuerySchema,
} from '../schemas/attendanceSchemas.js'
import * as attendanceService from '../services/attendanceService.js'
import mongoose from 'mongoose'
import { Attendance } from '../models/Attendance.js'
import { exportData, type ExportFormat } from '../../../shared/importExport/spreadsheet.js'

const router = Router()

router.get('/export', authenticate, resolveTenant, requirePermission('attendance:read'), async (req: Request, res: Response) => {
  const format = String(req.query.format || 'csv') as ExportFormat
  if (!['csv', 'xlsx', 'pdf'].includes(format)) { res.status(400).json({ error: 'format must be csv, xlsx, or pdf' }); return }
  const records = await Attendance.find({ schoolId: req.tenantId! }).populate('studentId', 'admissionNo profile.firstName profile.lastName').populate('classId', 'grade section').lean()
  const file = await exportData({ format, columns: [{ key: 'date', label: 'Date' }, { key: 'student', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'status', label: 'Status' }], rows: records.map((record) => ({ date: new Date(record.date).toISOString().slice(0, 10), student: `${(record.studentId as any)?.profile?.firstName ?? ''} ${(record.studentId as any)?.profile?.lastName ?? ''}`.trim(), class: `${(record.classId as any)?.grade ?? ''}-${(record.classId as any)?.section ?? ''}`, status: record.status })) })
  res.type(file.contentType).attachment(`attendance.${file.extension}`).send(file.buffer)
})

// ── POST /attendance/mark — bulk mark a class ────────────────────────

router.post(
  '/mark',
  authenticate,
  resolveTenant,
  requirePermission('attendance:mark'),
  async (req: Request, res: Response) => {
    try {
      const parsed = markAttendanceSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      // Verify teacher is assigned to this class
      const isAssigned = await attendanceService.isTeacherAssignedToClass(userId, parsed.classId, tenantId)
      if (!isAssigned && !req.user!.roles.includes('school_admin') && !req.user!.roles.includes('super_admin')) {
        res.status(403).json({ error: 'You are not assigned to this class' })
        return
      }

      const result = await attendanceService.markAttendance(tenantId, parsed, userId, req.user!.email)
      res.status(201).json({
        message: 'Attendance marked successfully',
        records: result.records.length,
        alerts: result.alerts,
      })
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Failed to mark attendance' })
    }
  },
)

// ── PATCH /attendance/:id — correct a single record ──────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('attendance:mark'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateAttendanceSchema.parse(req.body)
      const tenantId = req.tenantId!
      const attendanceId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const attendance = await attendanceService.updateAttendance(tenantId, attendanceId, parsed, userId, req.user!.email)
      res.json(attendance)
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Failed to update attendance' })
    }
  },
)

// ── GET /attendance/class/:classId — class attendance view ───────────

router.get(
  '/class/:classId',
  authenticate,
  resolveTenant,
  requirePermission('attendance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const classId = String(req.params.classId)
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '50') || 50, 100)

      const result = await attendanceService.getClassAttendance(tenantId, classId, { startDate, endDate, page, limit })
      res.json(result)
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Failed to fetch class attendance' })
    }
  },
)

// ── GET /attendance/student/:studentId — student attendance history ──

router.get(
  '/student/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('attendance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.studentId)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      // Parent: verify this is their child
      if (req.user!.roles.includes('parent')) {
        const { Guardian } = await import('../../students/models/Guardian.js')
        const guardians = await Guardian.find({ userId, schoolId: tenantId })
        const guardianIds = guardians.map((g) => g._id.toString())

        const { Student } = await import('../../students/models/Student.js')
        const student = await Student.findOne({ _id: studentId, schoolId: tenantId })
        if (!student) {
          res.status(404).json({ error: 'Student not found' })
          return
        }

        const isChild = student.guardianIds.some((g: mongoose.Types.ObjectId) => guardianIds.includes(g.toString()))
        if (!isChild) {
          res.status(403).json({ error: 'Access denied: not your child' })
          return
        }
      }

      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '50') || 50, 100)

      const result = await attendanceService.getStudentAttendance(tenantId, studentId, { startDate, endDate, page, limit })
      res.json(result)
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Failed to fetch student attendance' })
    }
  },
)

// ── GET /attendance/summary — attendance summary with counts ─────────

router.get(
  '/summary',
  authenticate,
  resolveTenant,
  requirePermission('attendance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const parsed = attendanceSummaryQuerySchema.parse(req.query)

      const result = await attendanceService.getAttendanceSummary(tenantId, {
        classId: parsed.classId,
        studentId: parsed.studentId,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      })
      res.json(result)
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message })
        return
      }
      res.status(500).json({ error: 'Failed to fetch attendance summary' })
    }
  },
)

export default router
