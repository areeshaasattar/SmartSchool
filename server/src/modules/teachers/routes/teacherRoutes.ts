import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { validate } from '../../../middlewares/validation/validate.js'
import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherSelfEditSchema,
} from '../schemas/teacherSchemas.js'
import * as teacherService from '../services/teacherService.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import mongoose from 'mongoose'

const router = Router()

// ── POST /teachers — create teacher + optionally create/link user ────

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('teacher:create'),
  validate(createTeacherSchema),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacher = await teacherService.createTeacher({
        schoolId: tenantId,
        ...req.body,
      })

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'teacher:create',
        entity: 'Teacher',
        entityId: (teacher._id as mongoose.Types.ObjectId).toString(),
        after: { employeeNo: teacher.employeeNo, profile: teacher.profile },
        ipAddress: req.ip,
      })

      res.status(201).json({
        message: 'Teacher created',
        teacher: {
          id: (teacher._id as mongoose.Types.ObjectId).toString(),
          employeeNo: teacher.employeeNo,
          profile: teacher.profile,
          employment: teacher.employment,
          departments: teacher.departments,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Employee number already exists for this school') {
        res.status(409).json({ error: error.message })
        return
      }
      throw error
    }
  },
)

// ── GET /teachers — list teachers (tenant-scoped, role-filtered) ─────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('teacher:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '20') || 20, 100)
      const search = typeof req.query.search === 'string' ? req.query.search : undefined
      const status = typeof req.query.status === 'string' ? req.query.status : undefined
      const department = typeof req.query.department === 'string' ? req.query.department : undefined

      // Teacher role: only their own record
      const isTeacher = req.user!.roles.includes('teacher')
      const selfUserId = isTeacher ? (req.user!._id as mongoose.Types.ObjectId).toString() : undefined

      const result = await teacherService.listTeachers({
        schoolId: tenantId,
        page,
        limit,
        search,
        status,
        department,
        selfUserId,
      })

      res.json(result)
    } catch (error) {
      throw error
    }
  },
)

// ── GET /teachers/me — teacher self-view (must be before /:id) ───────

router.get(
  '/me',
  authenticate,
  resolveTenant,
  requirePermission('teacher:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const teacher = await teacherService.getTeacherByUserId(userId, tenantId)
      if (!teacher) {
        res.status(404).json({ error: 'Teacher profile not found' })
        return
      }

      res.json({
        teacher: {
          id: (teacher._id as mongoose.Types.ObjectId).toString(),
          employeeNo: teacher.employeeNo,
          profile: teacher.profile,
          employment: teacher.employment,
          qualifications: teacher.qualifications,
          departments: teacher.departments,
          subjects: teacher.subjects,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ── GET /teachers/:id — single teacher ───────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('teacher:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacherId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        res.status(400).json({ error: 'Invalid teacher ID format' })
        return
      }

      // Teacher role: only their own record
      if (req.user!.roles.includes('teacher')) {
        const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
        const ownTeacher = await teacherService.getTeacherByUserId(userId, tenantId)
        if (!ownTeacher || ownTeacher._id.toString() !== teacherId) {
          res.status(403).json({ error: 'Access denied: can only view your own record' })
          return
        }
      }

      const teacher = await teacherService.getTeacherById(teacherId, tenantId)
      if (!teacher) {
        res.status(404).json({ error: 'Teacher not found' })
        return
      }

      res.json({
        teacher: {
          id: (teacher._id as mongoose.Types.ObjectId).toString(),
          employeeNo: teacher.employeeNo,
          profile: teacher.profile,
          employment: teacher.employment,
          qualifications: teacher.qualifications,
          departments: teacher.departments,
          subjects: teacher.subjects,
          userId: (teacher.userId as any)?._id || teacher.userId,
          email: (teacher.userId as any)?.email,
          createdAt: teacher.createdAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ── PATCH /teachers/:id — update teacher ─────────────────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacherId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        res.status(400).json({ error: 'Invalid teacher ID format' })
        return
      }

      const isSelfEdit = req.user!.roles.includes('teacher')

      if (isSelfEdit) {
        // Validate with self-edit schema
        const validation = teacherSelfEditSchema.safeParse(req.body)
        if (!validation.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: validation.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          })
          return
        }

        // Verify the teacher is updating their own record
        const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
        const ownTeacher = await teacherService.getTeacherByUserId(userId, tenantId)
        if (!ownTeacher || ownTeacher._id.toString() !== teacherId) {
          res.status(403).json({ error: 'Access denied: can only update your own record' })
          return
        }
      } else {
        // Admin edit — check permission inline
        const userRoles = req.user!.roles.map((r) => r as string)
        const { hasPermission } = await import('../../../middlewares/permissions/policy.js')
        if (!hasPermission(userRoles, 'teacher:update')) {
          res.status(403).json({ error: 'Forbidden', message: 'Permission denied: teacher:update' })
          return
        }
      }

      const before = await teacherService.getTeacherById(teacherId, tenantId)
      if (!before) {
        res.status(404).json({ error: 'Teacher not found' })
        return
      }

      const updated = await teacherService.updateTeacher(teacherId, tenantId, req.body, isSelfEdit)

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: isSelfEdit ? 'teacher:self_update' : 'teacher:update',
        entity: 'Teacher',
        entityId: teacherId,
        before: { status: before.employment.status },
        after: { status: updated.employment.status },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Teacher updated',
        teacher: {
          id: (updated._id as mongoose.Types.ObjectId).toString(),
          employeeNo: updated.employeeNo,
          profile: updated.profile,
          employment: updated.employment,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Employee number already exists for this school') {
        res.status(409).json({ error: error.message })
        return
      }
      throw error
    }
  },
)

// ── DELETE /teachers/:id — soft delete ───────────────────────────────

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('teacher:delete'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacherId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        res.status(400).json({ error: 'Invalid teacher ID format' })
        return
      }

      let updated
      try {
        updated = await teacherService.softDeleteTeacher(teacherId, tenantId)
      } catch (err) {
        if (err instanceof Error && err.message === 'Teacher not found') {
          res.status(404).json({ error: err.message })
          return
        }
        throw err
      }

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(tenantId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'teacher:delete',
        entity: 'Teacher',
        entityId: teacherId,
        before: { status: 'active' },
        after: { status: 'inactive' },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Teacher deactivated',
        teacher: {
          id: (updated._id as mongoose.Types.ObjectId).toString(),
          employment: updated.employment,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ── GET /teachers/:id/profile — Teacher profile aggregation ─────────

router.get(
  '/:id/profile',
  authenticate,
  resolveTenant,
  requirePermission('teacher:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const teacherId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        res.status(400).json({ error: 'Invalid teacher ID format' })
        return
      }

      // Teacher role: only their own profile
      if (req.user!.roles.includes('teacher')) {
        const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
        const ownTeacher = await teacherService.getTeacherByUserId(userId, tenantId)
        if (!ownTeacher || ownTeacher._id.toString() !== teacherId) {
          res.status(403).json({ error: 'Access denied: can only view your own profile' })
          return
        }
      }

      const data = await teacherService.getTeacherProfile(teacherId, tenantId)
      if (!data) {
        res.status(404).json({ error: 'Teacher not found' })
        return
      }

      res.json({ teacherProfile: data })
    } catch (error) {
      throw error
    }
  },
)

export default router
