import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requireRole, requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { validate } from '../../../middlewares/validation/validate.js'
import {
  createSchoolSchema,
  updateSchoolSettingsSchema,
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from '../schemas/schoolSchemas.js'
import * as schoolService from '../services/schoolService.js'
import { School } from '../models/School.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import mongoose from 'mongoose'

const router = Router()

// ══════════════════════════════════════════════════════════════════════
// School CRUD (platform-level)
// ══════════════════════════════════════════════════════════════════════

// POST /schools — super_admin only
router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  validate(createSchoolSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, code } = req.body

      const existing = await School.findOne({ code: code.toUpperCase() })
      if (existing) {
        res.status(409).json({ error: 'A school with this code already exists' })
        return
      }

      const school = await School.create({ name, code: code.toUpperCase() })

      await writeAuditLog({
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'school:create',
        entity: 'School',
        entityId: (school._id as mongoose.Types.ObjectId).toString(),
        after: { name: school.name, code: school.code, status: school.status },
        ipAddress: req.ip,
      })

      res.status(201).json({
        message: 'School created successfully',
        school: {
          id: (school._id as mongoose.Types.ObjectId).toString(),
          name: school.name,
          code: school.code,
          status: school.status,
          settings: school.settings,
          subscription: school.subscription,
          createdAt: school.createdAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// GET /schools — super_admin only (list all schools)
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  async (_req: Request, res: Response) => {
    try {
      const schools = await schoolService.listAllSchools()

      res.json({
        schools: schools.map((s) => ({
          id: (s._id as mongoose.Types.ObjectId).toString(),
          name: s.name,
          code: s.code,
          status: s.status,
          settings: s.settings,
          subscription: s.subscription,
          academicYearCount: s.academicYears.length,
          currentYear: s.academicYears.find((y) => y.isCurrent) || null,
          createdAt: s.createdAt,
        })),
      })
    } catch (error) {
      throw error
    }
  },
)

// ══════════════════════════════════════════════════════════════════════
// Single school (super_admin or school_admin/principal of that school)
// ══════════════════════════════════════════════════════════════════════

// GET /schools/:id
router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('school:read'),
  async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        res.status(400).json({ error: 'Invalid school ID format' })
        return
      }

      const isSuperAdmin = req.user!.roles.includes('super_admin')
      if (!isSuperAdmin && req.tenantId !== schoolId) {
        res.status(403).json({ error: 'Access denied: cannot view another school' })
        return
      }

      const school = await schoolService.getSchoolById(schoolId)
      if (!school) {
        res.status(404).json({ error: 'School not found' })
        return
      }

      res.json({
        school: {
          id: (school._id as mongoose.Types.ObjectId).toString(),
          name: school.name,
          code: school.code,
          status: school.status,
          settings: school.settings,
          academicYears: school.academicYears,
          subscription: school.subscription,
          createdAt: school.createdAt,
          updatedAt: school.updatedAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// PATCH /schools/:id — super_admin or school_admin (update settings)
router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('school:update_settings'),
  validate(updateSchoolSettingsSchema),
  async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        res.status(400).json({ error: 'Invalid school ID format' })
        return
      }

      const isSuperAdmin = req.user!.roles.includes('super_admin')
      if (!isSuperAdmin && req.tenantId !== schoolId) {
        res.status(403).json({ error: 'Access denied: cannot update another school' })
        return
      }

      const existing = await schoolService.getSchoolById(schoolId)
      if (!existing) {
        res.status(404).json({ error: 'School not found' })
        return
      }

      const before = {
        name: existing.name,
        status: existing.status,
        settings: JSON.parse(JSON.stringify(existing.settings)),
      }

      const updated = await schoolService.updateSchoolSettings(schoolId, req.body)

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'school:update_settings',
        entity: 'School',
        entityId: schoolId,
        before,
        after: {
          name: updated.name,
          status: updated.status,
          settings: JSON.parse(JSON.stringify(updated.settings)),
        },
        ipAddress: req.ip,
      })

      res.json({
        message: 'School updated successfully',
        school: {
          id: (updated._id as mongoose.Types.ObjectId).toString(),
          name: updated.name,
          code: updated.code,
          status: updated.status,
          settings: updated.settings,
          subscription: updated.subscription,
          updatedAt: updated.updatedAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// ══════════════════════════════════════════════════════════════════════
// Academic years
// ══════════════════════════════════════════════════════════════════════

// GET /schools/:id/academic-years
router.get(
  '/:id/academic-years',
  authenticate,
  resolveTenant,
  requirePermission('academic_year:list'),
  async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        res.status(400).json({ error: 'Invalid school ID format' })
        return
      }

      const isSuperAdmin = req.user!.roles.includes('super_admin')
      if (!isSuperAdmin && req.tenantId !== schoolId) {
        res.status(403).json({ error: 'Access denied: cannot view another school' })
        return
      }

      const years = await schoolService.listAcademicYears(schoolId)

      res.json({
        academicYears: years.map((y) => ({
          id: y._id ? (y._id as mongoose.Types.ObjectId).toString() : '',
          label: y.label,
          startDate: y.startDate,
          endDate: y.endDate,
          isCurrent: y.isCurrent,
        })),
      })
    } catch (error) {
      throw error
    }
  },
)

// POST /schools/:id/academic-years — school_admin+
router.post(
  '/:id/academic-years',
  authenticate,
  resolveTenant,
  requirePermission('academic_year:create'),
  validate(createAcademicYearSchema),
  async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.params.id)

      if (!mongoose.Types.ObjectId.isValid(schoolId)) {
        res.status(400).json({ error: 'Invalid school ID format' })
        return
      }

      const isSuperAdmin = req.user!.roles.includes('super_admin')
      if (!isSuperAdmin && req.tenantId !== schoolId) {
        res.status(403).json({ error: 'Access denied: cannot modify another school' })
        return
      }

      const { label, startDate, endDate, isCurrent } = req.body

      const year = await schoolService.createAcademicYear(schoolId, {
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent ?? false,
      })

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'academic_year:create',
        entity: 'AcademicYear',
        entityId: year._id ? (year._id as mongoose.Types.ObjectId).toString() : undefined,
        after: { label, startDate, endDate, isCurrent },
        ipAddress: req.ip,
      })

      res.status(201).json({
        message: 'Academic year created',
        academicYear: {
          id: year._id ? (year._id as mongoose.Types.ObjectId).toString() : '',
          label: year.label,
          startDate: year.startDate,
          endDate: year.endDate,
          isCurrent: year.isCurrent,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// PATCH /schools/:id/academic-years/:yearId — school_admin+
router.patch(
  '/:id/academic-years/:yearId',
  authenticate,
  resolveTenant,
  requirePermission('academic_year:update'),
  validate(updateAcademicYearSchema),
  async (req: Request, res: Response) => {
    try {
      const schoolId = String(req.params.id)
      const yearId = String(req.params.yearId)

      if (!mongoose.Types.ObjectId.isValid(schoolId) || !mongoose.Types.ObjectId.isValid(yearId)) {
        res.status(400).json({ error: 'Invalid ID format' })
        return
      }

      const isSuperAdmin = req.user!.roles.includes('super_admin')
      if (!isSuperAdmin && req.tenantId !== schoolId) {
        res.status(403).json({ error: 'Access denied: cannot modify another school' })
        return
      }

      const input: Record<string, unknown> = {}
      if (req.body.label !== undefined) input.label = req.body.label
      if (req.body.startDate !== undefined) input.startDate = new Date(req.body.startDate)
      if (req.body.endDate !== undefined) input.endDate = new Date(req.body.endDate)
      if (req.body.isCurrent !== undefined) input.isCurrent = req.body.isCurrent

      const year = await schoolService.updateAcademicYear(schoolId, yearId, input as any)

      await writeAuditLog({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'academic_year:update',
        entity: 'AcademicYear',
        entityId: yearId,
        after: { label: year.label, startDate: year.startDate, endDate: year.endDate, isCurrent: year.isCurrent },
        ipAddress: req.ip,
      })

      res.json({
        message: 'Academic year updated',
        academicYear: {
          id: year._id ? (year._id as mongoose.Types.ObjectId).toString() : '',
          label: year.label,
          startDate: year.startDate,
          endDate: year.endDate,
          isCurrent: year.isCurrent,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

export default router
