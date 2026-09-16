import { Router, Request, Response } from 'express'
import { authenticate } from '../../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../../middlewares/tenant/resolveTenant.js'
import { requireRole } from '../../../../middlewares/permissions/requireRole.js'
import { aiUserRateLimit } from '../../../../middlewares/validation/rateLimit.js'
import { z } from 'zod'
import * as draftService from '../services/draftService.js'
import mongoose from 'mongoose'

const router = Router()

// All teacher-tools endpoints are scoped to /ai/teacher-tools
router.use(authenticate, resolveTenant, requireRole('teacher', 'school_admin'))

// ── POST /ai/teacher-tools/quiz/generate ────────────────────────────────────

const generateSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  topic: z.string().min(1).max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.number().int().min(1).max(50),
  questionTypes: z.array(z.enum(['mcq', 'short_answer', 'essay'])).min(1),
})

router.post('/quiz/generate', aiUserRateLimit, async (req: Request, res: Response) => {
  try {
    const parsed = generateSchema.parse(req.body)
    const schoolId = req.tenantId!
    const teacherUserId = (req.user!._id as mongoose.Types.ObjectId).toString()

    const draft = await draftService.generateQuizDraft({
      schoolId,
      teacherUserId,
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      topic: parsed.topic,
      difficulty: parsed.difficulty,
      questionCount: parsed.questionCount,
      questionTypes: parsed.questionTypes,
      actorEmail: req.user!.email,
    })

    res.status(201).json(draft)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate quiz draft'
    const status = message.includes('not assigned') || message.includes('not found') ? 400 : 400
    res.status(status).json({ error: message })
  }
})

// ── GET /ai/teacher-tools/drafts ────────────────────────────────────────────

router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const schoolId = req.tenantId!
    const teacherUserId = (req.user!._id as mongoose.Types.ObjectId).toString()
    const status = (typeof req.query.status === 'string' && req.query.status in { generated: 1, edited: 1, approved: 1, discarded: 1 })
      ? (req.query.status as 'generated' | 'edited' | 'approved' | 'discarded')
      : undefined
    const page = parseInt(String(req.query.page) || '1') || 1
    const limit = Math.min(parseInt(String(req.query.limit) || '20') || 20, 100)

    const result = await draftService.listTeacherDrafts(schoolId, teacherUserId, { status, page, limit })
    res.json(result)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list drafts' })
  }
})

// ── GET /ai/teacher-tools/drafts/:id ────────────────────────────────────────

router.get('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const schoolId = req.tenantId!
    const actorUserId = (req.user!._id as mongoose.Types.ObjectId).toString()
    const draft = await draftService.getDraftById(schoolId, String(req.params.id), actorUserId, [...req.user!.roles])

    if (!draft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    res.json(draft)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get draft' })
  }
})

// ── PATCH /ai/teacher-tools/drafts/:id ──────────────────────────────────────

const patchSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().min(1).max(2000),
      type: z.enum(['mcq', 'short_answer', 'essay']),
      options: z.array(z.string().min(1)).optional(),
      correctAnswer: z.string().min(1).max(2000),
      explanation: z.string().min(1).max(2000),
    }),
  ),
})

router.patch('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const parsed = patchSchema.parse(req.body)
    const schoolId = req.tenantId!
    const teacherUserId = (req.user!._id as mongoose.Types.ObjectId).toString()

    const draft = await draftService.patchDraftQuestions({
      schoolId,
      draftId: String(req.params.id),
      teacherUserId,
      questions: parsed.questions,
    })

    res.json(draft)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update draft'
    const status = message.includes('not found') || message.includes('not editable') ? 404 : 400
    res.status(status).json({ error: message })
  }
})

// ── DELETE /ai/teacher-tools/drafts/:id ─────────────────────────────────────

router.delete('/drafts/:id', async (req: Request, res: Response) => {
  try {
    const schoolId = req.tenantId!
    const teacherUserId = (req.user!._id as mongoose.Types.ObjectId).toString()

    const draft = await draftService.discardDraft({
      schoolId,
      draftId: String(req.params.id),
      teacherUserId,
    })

    res.json(draft)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to discard draft'
    const status = message.includes('not found') || message.includes('not discardable') ? 404 : 400
    res.status(status).json({ error: message })
  }
})

// ── POST /ai/teacher-tools/drafts/:id/approve ───────────────────────────────

const approveSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dueDate: z.string().min(1),
  maxMarks: z.number().int().min(1),
  academicYearId: z.string().min(1),
})

router.post('/drafts/:id/approve', async (req: Request, res: Response) => {
  try {
    const parsed = approveSchema.parse(req.body)
    const schoolId = req.tenantId!
    const teacherUserId = (req.user!._id as mongoose.Types.ObjectId).toString()

    const { draft, assignmentId } = await draftService.approveDraft({
      schoolId,
      draftId: String(req.params.id),
      teacherUserId,
      title: parsed.title,
      dueDate: parsed.dueDate,
      maxMarks: parsed.maxMarks,
      academicYearId: parsed.academicYearId,
      actorEmail: req.user!.email,
    })

    res.json({ draft, assignmentId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to approve draft'
    const status = message.includes('not found') || message.includes('not approvable') ? 404 : 400
    res.status(status).json({ error: message })
  }
})

export default router
