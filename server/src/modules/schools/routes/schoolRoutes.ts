import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requireRole } from '../../../middlewares/permissions/requireRole.js'
import { validate } from '../../../middlewares/validation/validate.js'
import { createSchoolSchema } from '../schemas/schoolSchemas.js'
import { School } from '../models/School.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'

const router = Router()

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

      // Audit log
      await writeAuditLog({
        actorId: req.user!._id,
        actorEmail: req.user!.email,
        action: 'school:create',
        entity: 'School',
        entityId: (school._id as unknown as string).toString(),
        after: { name: school.name, code: school.code, status: school.status },
        ipAddress: req.ip,
      })

      res.status(201).json({
        message: 'School created successfully',
        school: {
          id: school._id,
          name: school.name,
          code: school.code,
          status: school.status,
          createdAt: school.createdAt,
        },
      })
    } catch (error) {
      throw error
    }
  },
)

// GET /schools — super_admin only
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  async (_req: Request, res: Response) => {
    try {
      const schools = await School.find().sort({ createdAt: -1 })

      res.json({
        schools: schools.map((s) => ({
          id: s._id,
          name: s.name,
          code: s.code,
          status: s.status,
          createdAt: s.createdAt,
        })),
      })
    } catch (error) {
      throw error
    }
  },
)

export default router
