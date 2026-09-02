import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { createExamSchema, updateExamSchema, marksEntrySchema, correctMarksSchema } from '../schemas/examSchemas.js'
import * as examService from '../services/examService.js'
import mongoose from 'mongoose'

const router = Router()

// ── POST /exams — create exam ────────────────────────────────────────

router.post(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('exam:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createExamSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const exam = await examService.createExam(tenantId, parsed, userId, req.user!.email)
      res.status(201).json(exam)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create exam'
      res.status(400).json({ error: message })
    }
  },
)

// ── PATCH /exams/:id — update exam ───────────────────────────────────

router.patch(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('exam:create'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateExamSchema.parse(req.body)
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const exam = await examService.updateExam(tenantId, examId, parsed, userId, req.user!.email)
      res.json(exam)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update exam'
      res.status(400).json({ error: message })
    }
  },
)

// ── GET /exams — list exams ──────────────────────────────────────────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('exam:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined
      const term = typeof req.query.term === 'string' ? req.query.term : undefined

      const exams = await examService.listExams(tenantId, { academicYearId, term })
      res.json(exams)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list exams'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /exams/:id — get exam ────────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('exam:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)

      const exam = await examService.getExamById(tenantId, examId)
      if (!exam) {
        res.status(404).json({ error: 'Exam not found' })
        return
      }
      res.json(exam)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get exam'
      res.status(500).json({ error: message })
    }
  },
)

// ── DELETE /exams/:id — delete exam ──────────────────────────────────

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('exam:create'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      await examService.deleteExam(tenantId, examId, userId, req.user!.email)
      res.json({ message: 'Exam deleted successfully' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete exam'
      res.status(400).json({ error: message })
    }
  },
)

// ── POST /exams/:id/marks — bulk marks entry ─────────────────────────

router.post(
  '/:id/marks',
  authenticate,
  resolveTenant,
  requirePermission('exam:grade'),
  async (req: Request, res: Response) => {
    try {
      const parsed = marksEntrySchema.parse(req.body)
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const results = await examService.enterMarks(tenantId, examId, parsed, userId, req.user!.email)
      res.json({ message: 'Marks entered', count: results.length })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enter marks'
      res.status(400).json({ error: message })
    }
  },
)

// ── PATCH /exams/:id/marks/:studentId — correct marks ───────────────

router.patch(
  '/:id/marks/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('exam:grade'),
  async (req: Request, res: Response) => {
    try {
      const parsed = correctMarksSchema.parse(req.body)
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const studentId = String(req.params.studentId)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const result = await examService.correctMarks(tenantId, examId, studentId, parsed, userId, req.user!.email)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to correct marks'
      res.status(400).json({ error: message })
    }
  },
)

// ── POST /exams/:id/publish — publish exam ───────────────────────────

router.post(
  '/:id/publish',
  authenticate,
  resolveTenant,
  requirePermission('exam:create'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const exam = await examService.publishExam(tenantId, examId, userId, req.user!.email)
      res.json(exam)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish exam'
      res.status(400).json({ error: message })
    }
  },
)

// ── GET /exams/:id/results/class/:classId — class results ────────────

router.get(
  '/:id/results/class/:classId',
  authenticate,
  resolveTenant,
  requirePermission('exam:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const classId = String(req.params.classId)

      const results = await examService.getClassResults(tenantId, examId, classId)
      res.json(results)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get results'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /exams/:id/results/student/:studentId — student result ───────

router.get(
  '/:id/results/student/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('exam:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const studentId = String(req.params.studentId)

      const result = await examService.getStudentResult(tenantId, examId, studentId)
      if (!result) {
        res.status(404).json({ error: 'Result not found' })
        return
      }
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get result'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /exams/:id/report-card/:studentId — report card ──────────────

router.get(
  '/:id/report-card/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('exam:list'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const examId = String(req.params.id)
      const studentId = String(req.params.studentId)

      const reportCard = await examService.getReportCard(tenantId, examId, studentId)
      if (!reportCard) {
        res.status(404).json({ error: 'Report card not found' })
        return
      }
      res.json(reportCard)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get report card'
      res.status(500).json({ error: message })
    }
  },
)

export default router
