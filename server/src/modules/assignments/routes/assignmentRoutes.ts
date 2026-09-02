import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from '../schemas/assignmentSchemas.js'
import * as assignmentService from '../services/assignmentService.js'
import mongoose from 'mongoose'

const router = Router()

// ── POST /assignments — create as draft ──────────────────────────────

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('assignment:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createAssignmentSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const assignment = await assignmentService.createAssignment(tenantId, parsed, userId, req.user!.email)
      res.status(201).json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment'
      res.status(400).json({ error: message })
    }
  },
)

// ── PATCH /assignments/:id — update draft ────────────────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('assignment:update'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateAssignmentSchema.parse(req.body)
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const assignment = await assignmentService.updateAssignment(tenantId, assignmentId, parsed, userId, req.user!.email)
      res.json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update assignment'
      const status = message.includes('not found') ? 404 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── POST /assignments/:id/publish — flip draft → published ───────────

router.post(
  '/:id/publish',
  authenticate,
  resolveTenant,
  requirePermission('assignment:update'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const assignment = await assignmentService.publishAssignment(tenantId, assignmentId, userId, req.user!.email)
      res.json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish assignment'
      res.status(400).json({ error: message })
    }
  },
)

// ── DELETE /assignments/:id — delete (reject if submissions exist) ────

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('assignment:delete'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      await assignmentService.deleteAssignment(tenantId, assignmentId, userId, req.user!.email)
      res.json({ message: 'Assignment deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete assignment'
      const status = message.includes('not found') ? 404 : 400
      res.status(status).json({ error: message })
    }
  },
)

// ── GET /assignments/class/:classId — list class assignments ─────────

router.get(
  '/class/:classId',
  authenticate,
  resolveTenant,
  requirePermission('assignment:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const classId = String(req.params.classId)
      const status = typeof req.query.status === 'string' ? req.query.status : undefined
      const page = parseInt(String(req.query.page) || '1') || 1
      const limit = Math.min(parseInt(String(req.query.limit) || '20') || 20, 100)

      const isTeacherOrAdmin = req.user!.roles.includes('teacher') ||
        req.user!.roles.includes('school_admin') ||
        req.user!.roles.includes('super_admin')

      const result = await assignmentService.listClassAssignments(tenantId, classId, { status, page, limit }, isTeacherOrAdmin)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list assignments'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /assignments/:id — get single assignment ─────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('assignment:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)

      const assignment = await assignmentService.getAssignmentById(tenantId, assignmentId)
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' })
        return
      }
      res.json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get assignment'
      res.status(500).json({ error: message })
    }
  },
)

// ── POST /assignments/:id/submit — student submits ───────────────────

router.post(
  '/:id/submit',
  authenticate,
  resolveTenant,
  requirePermission('assignment:submit'),
  async (req: Request, res: Response) => {
    try {
      const parsed = submitAssignmentSchema.parse(req.body)
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const submission = await assignmentService.submitToAssignment(tenantId, assignmentId, userId, {
        content: parsed.content,
        attachments: parsed.attachments,
      }, req.user!.email)

      res.status(201).json(submission)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit assignment'
      res.status(400).json({ error: message })
    }
  },
)

// ── GET /assignments/:id/submissions — list submissions for grading ──

router.get(
  '/:id/submissions',
  authenticate,
  resolveTenant,
  requirePermission('assignment:grade'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)

      const submissions = await assignmentService.listSubmissions(tenantId, assignmentId)
      res.json(submissions)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list submissions'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /assignments/:id/submissions/:studentId — get one submission ─

router.get(
  '/:id/submissions/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('assignment:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const studentId = String(req.params.studentId)

      // Parent: verify this is their child
      if (req.user!.roles.includes('parent')) {
        const { Guardian } = await import('../../students/models/Guardian.js')
        const guardians = await Guardian.find({ userId: (req.user!._id as mongoose.Types.ObjectId).toString(), schoolId: tenantId })
        const guardianIds = guardians.map((g) => g._id.toString())

        const StudentModel = mongoose.model('Student')
        const student = await StudentModel.findOne({ _id: studentId, schoolId: tenantId })
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

      const submission = await assignmentService.getSubmission(tenantId, assignmentId, studentId)
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' })
        return
      }
      res.json(submission)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get submission'
      res.status(500).json({ error: message })
    }
  },
)

// ── PATCH /assignments/:id/submissions/:studentId — grade ────────────

router.patch(
  '/:id/submissions/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('assignment:grade'),
  async (req: Request, res: Response) => {
    try {
      const parsed = gradeSubmissionSchema.parse(req.body)
      const tenantId = req.tenantId!
      const assignmentId = String(req.params.id)
      const studentId = String(req.params.studentId)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const submission = await assignmentService.gradeSubmission(tenantId, assignmentId, studentId, parsed, userId, req.user!.email)
      res.json(submission)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to grade submission'
      res.status(400).json({ error: message })
    }
  },
)

export default router
