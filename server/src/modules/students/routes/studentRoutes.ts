import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { validate } from '../../../middlewares/validation/validate.js'
import {
  createStudentSchema,
  updateStudentSchema,
  attachGuardianSchema,
  listStudentsQuerySchema,
} from '../schemas/studentSchemas.js'
import * as studentService from '../services/studentService.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import mongoose from 'mongoose'

const router = Router()

// ── POST /students — create student + optionally create/link guardian ─

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('student:create'),
  validate(createStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const student = await studentService.createStudent({
        schoolId: tenantId,
        ...req.body,
      })

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'student:create',
        entity: 'Student',
        entityId: (student._id as mongoose.Types.ObjectId).toString(),
        after: { admissionNo: student.admissionNo, profile: student.profile },
        ipAddress: req.ip,
      })

      res.status(201).json({
        message: 'Student created',
        student: {
          id: (student._id as mongoose.Types.ObjectId).toString(),
          admissionNo: student.admissionNo,
          profile: student.profile,
          status: student.status,
          emergencyContact: student.emergencyContact,
          guardianIds: student.guardianIds.map((g) => g.toString()),
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Admission number already exists for this school') {
        res.status(409).json({ error: error.message })
        return
      }
      throw error
    }
  },
)

// ── GET /students — list students (tenant-scoped, role-filtered) ─────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('student:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '20') || 20, 100)
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const status = typeof req.query.status === 'string' ? req.query.status : undefined
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined

      // Parent role: only their own children
      const isParent = req.user!.roles.includes('parent')
      const parentUserId = isParent ? (req.user!._id as mongoose.Types.ObjectId).toString() : undefined

      const result = await studentService.listStudents({
        schoolId: tenantId,
        page,
        limit,
        search,
        status,
        classId,
        parentUserId,
      })

      res.json(result)
    } catch (error) {
      throw error
    }
  },
)

// ── GET /students/:id — single student ───────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('student:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: 'Invalid student ID format' })
        return
      }

      const student = await studentService.getStudentById(studentId, tenantId)
      if (!student) {
        res.status(404).json({ error: 'Student not found' })
        return
      }

      // Parent: verify this student is their child
      if (req.user!.roles.includes('parent')) {
        const isLinked = student.guardianIds.some((g: any) =>
          g.userId?.toString() === (req.user!._id as mongoose.Types.ObjectId).toString(),
        )
        // If guardianIds are populated, check userId; otherwise check via Guardian model
        if (!isLinked) {
          const { Guardian } = await import('../models/Guardian.js')
          const guardians = await Guardian.find({
            userId: req.user!._id,
            schoolId: tenantId,
          })
          const guardianIds = guardians.map((g) => g._id.toString())
          const studentIsLinked = student.guardianIds.some((g: any) =>
            guardianIds.includes(g.toString()),
          )
          if (!studentIsLinked) {
            res.status(403).json({ error: 'Access denied: not your child' })
            return
          }
        }
      }

      res.json({
        student: {
          id: (student._id as mongoose.Types.ObjectId).toString(),
          admissionNo: student.admissionNo,
          profile: student.profile,
          emergencyContact: student.emergencyContact,
          status: student.status,
          classId: student.classId,
          sectionId: student.sectionId,
          academicYearId: student.academicYearId,
          guardianIds: student.guardianIds,
          createdAt: student.createdAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ── PATCH /students/:id — update student ─────────────────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('student:update'),
  validate(updateStudentSchema),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: 'Invalid student ID format' })
        return
      }

      const before = await studentService.getStudentById(studentId, tenantId)
      if (!before) {
        res.status(404).json({ error: 'Student not found' })
        return
      }

      const updated = await studentService.updateStudent(studentId, tenantId, req.body)

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'student:update',
        entity: 'Student',
        entityId: studentId,
        before: { status: before.status, admissionNo: before.admissionNo },
        after: { status: updated.status, admissionNo: updated.admissionNo },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Student updated',
        student: {
          id: (updated._id as mongoose.Types.ObjectId).toString(),
          admissionNo: updated.admissionNo,
          profile: updated.profile,
          status: updated.status,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Admission number already exists for this school') {
        res.status(409).json({ error: error.message })
        return
      }
      throw error
    }
  },
)

// ── DELETE /students/:id — soft delete ───────────────────────────────

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('student:delete'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: 'Invalid student ID format' })
        return
      }

      let updated
      try {
        updated = await studentService.softDeleteStudent(studentId, tenantId)
      } catch (err) {
        if (err instanceof Error && err.message === 'Student not found') {
          res.status(404).json({ error: err.message })
          return
        }
        throw err
      }

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'student:delete',
        entity: 'Student',
        entityId: studentId,
        before: { status: 'active' },
        after: { status: 'inactive' },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Student deactivated',
        student: {
          id: (updated._id as mongoose.Types.ObjectId).toString(),
          status: updated.status,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ── GET /students/:id/360 — Student 360 aggregation ─────────────────

router.get(
  '/:id/360',
  authenticate,
  resolveTenant,
  requirePermission('student:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: 'Invalid student ID format' })
        return
      }

      const data = await studentService.getStudent360(studentId, tenantId)
      if (!data) {
        res.status(404).json({ error: 'Student not found' })
        return
      }

      res.json({ student360: data })
    } catch (error) {
      throw error
    }
  },
)

// ── POST /students/:id/guardians — attach guardian ───────────────────

router.post(
  '/:id/guardians',
  authenticate,
  resolveTenant,
  requirePermission('student:update'),
  validate(attachGuardianSchema),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ error: 'Invalid student ID format' })
        return
      }

      const guardian = await studentService.attachGuardianToStudent(studentId, tenantId, req.body)

      res.status(201).json({
        message: 'Guardian attached',
        guardian: {
          id: (guardian._id as mongoose.Types.ObjectId).toString(),
          relationship: guardian.relationship,
          userId: guardian.userId,
          children: guardian.children.map((c) => c.toString()),
        },
      })
    } catch (error) {
      throw error
    }
  },
)

export default router
