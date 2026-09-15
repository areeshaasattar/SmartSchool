import mongoose from 'mongoose'
import { z } from 'zod'
import { AIDraft, IAIDraft, IQuestion, AIDraftStatus } from '../models/AIDraft.js'
import { Class } from '../../../classes/models/Class.js'
import { Subject } from '../../../classes/models/Subject.js'
import { Teacher } from '../../../teachers/models/Teacher.js'
import { isTeacherAssignedToClass } from '../../../assignments/services/assignmentService.js'
import { createAssignment, CreateAssignmentInput } from '../../../assignments/services/assignmentService.js'
import { writeAuditLog } from '../../../audit/models/AuditLog.js'
import { AIServiceClientError, processAIRequest } from '../../../ai/services/aiServiceClient.js'

const quizGenerateSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  topic: z.string().min(1).max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.number().int().min(1).max(50),
  questionTypes: z.array(z.enum(['mcq', 'short_answer', 'essay'])).min(1),
})

const patchQuestionsSchema = z.array(
  z.object({
    question: z.string().min(1).max(2000),
    type: z.enum(['mcq', 'short_answer', 'essay']),
    options: z.array(z.string().min(1)).optional(),
    correctAnswer: z.string().min(1).max(2000),
    explanation: z.string().min(1).max(2000),
  }),
)

interface QuizPayload {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  questionTypes: Array<'mcq' | 'short_answer' | 'essay'>
}

export interface GenerateQuizDraftInput {
  schoolId: string
  teacherUserId: string
  classId: string
  subjectId: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  questionTypes: Array<'mcq' | 'short_answer' | 'essay'>
  actorEmail?: string
}

export async function generateQuizDraft(input: GenerateQuizDraftInput): Promise<IAIDraft> {
  const { schoolId, teacherUserId, classId, subjectId, topic, difficulty, questionCount, questionTypes } = input

  const isAssigned = await isTeacherAssignedToClass(teacherUserId, classId, schoolId)
  if (!isAssigned) {
    throw new Error('You are not assigned to this class')
  }

  const teacher = await Teacher.findOne({ userId: teacherUserId, schoolId })
  if (!teacher) {
    throw new Error('Teacher profile not found')
  }

  const cls = await Class.findOne({ class: new mongoose.Types.ObjectId(classId), schoolId })
  if (!cls) {
    throw new Error('Class not found')
  }

  const subject = await Subject.findOne({ subject: new mongoose.Types.ObjectId(subjectId), schoolId })
  if (!subject) {
    throw new Error('Subject not found')
  }

  const payload: QuizPayload = { topic, difficulty, questionCount, questionTypes }
  let aiResponse
  try {
    aiResponse = await processAIRequest({
      schoolId,
      userId: teacherUserId,
      roles: ['teacher'],
      requestType: 'teacher_quiz_draft',
      payload: payload as unknown as Record<string, unknown>,
      authorizedContext: { schoolId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate quiz draft'
    throw new AIServiceClientError(message, 502)
  }

  if (aiResponse.status === 'error') {
    const msg = aiResponse.result?.message || 'AI service returned an error'
    if (typeof msg !== 'string' || !msg.trim()) throw new Error('AI service returned an error')
    throw new Error(msg)
  }

  const generatedQuestions = (aiResponse.result?.questions as IQuestion[]) ?? []
  if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
    throw new Error('AI returned an empty or invalid question set')
  }

  const normalizedQuestions = normalizeQuestions(generatedQuestions, questionTypes)

  const draft = await AIDraft.create({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    teacherId: teacher._id,
    classId: new mongoose.Types.ObjectId(classId),
    subjectId: new mongoose.Types.ObjectId(subjectId),
    draftType: 'quiz',
    requestParams: {
      topic,
      difficulty,
      questionCount,
      questionTypes,
    },
    generatedContent: { questions: normalizedQuestions },
    status: 'generated',
  })

  return draft
}

export interface PatchDraftInput {
  schoolId: string
  draftId: string
  teacherUserId: string
  questions: IQuestion[]
}

export async function patchDraftQuestions(input: PatchDraftInput): Promise<IAIDraft> {
  const draft = await findAccessibleDraft(input.schoolId, input.draftId, input.teacherUserId, ['generated', 'edited'])
  if (!draft) {
    throw new Error('Draft not found or not editable')
  }

  const normalized = normalizeQuestions(input.questions, draft.requestParams.questionTypes)
  if (normalized.length === 0) {
    throw new Error('A draft must contain at least one question')
  }

  draft.generatedContent.questions = normalized
  draft.status = 'edited'
  draft.reviewedAt = new Date()
  await draft.save()

  return draft
}

export interface DiscardDraftInput {
  schoolId: string
  draftId: string
  teacherUserId: string
}

export async function discardDraft(input: DiscardDraftInput): Promise<IAIDraft> {
  const draft = await findAccessibleDraft(input.schoolId, input.draftId, input.teacherUserId, ['generated', 'edited'])
  if (!draft) {
    throw new Error('Draft not found or not discardable')
  }

  draft.status = 'discarded'
  draft.reviewedAt = new Date()
  await draft.save()

  return draft
}

export interface ApproveDraftInput {
  schoolId: string
  draftId: string
  teacherUserId: string
  title?: string
  dueDate: string
  maxMarks: number
  academicYearId: string
  actorEmail?: string
}

export async function approveDraft(input: ApproveDraftInput): Promise<{ draft: IAIDraft; assignmentId: string }> {
  const draft = await findAccessibleDraft(input.schoolId, input.draftId, input.teacherUserId, ['generated', 'edited'])
  if (!draft) {
    throw new Error('Draft not found or not approvable')
  }

  const description = buildAssignmentDescription(draft.generatedContent.questions)
  const answerKeyNotes = draft.generatedContent.questions
    .map((q, idx) => `[Q${idx + 1}] ${q.question} — Answer: ${q.correctAnswer}`)
    .join('\n')

  const assignmentInput: CreateAssignmentInput = {
    classId: draft.classId.toString(),
    subjectId: draft.subjectId.toString(),
    title: input.title ?? `Quiz: ${draft.requestParams.topic}`,
    description,
    dueDate: input.dueDate,
    maxMarks: input.maxMarks,
    academicYearId: input.academicYearId,
  }

  const assignment = await createAssignment(input.schoolId, assignmentInput, input.teacherUserId, input.actorEmail)

  const patched = await assignment.updateOne({
    $set: {
      description: `${description}\n\n--- Teacher answer key (not shown to students) ---\n${answerKeyNotes}`,
    },
  })
  if (!patched || typeof patched.modifiedCount !== 'number') {
    throw new Error('Failed to update assignment description');
  }

  draft.status = 'approved'
  draft.publishedAssignmentId = assignment._id
  draft.reviewedAt = new Date()
  await draft.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(input.schoolId),
    actorId: new mongoose.Types.ObjectId(input.teacherUserId),
    actorEmail: input.actorEmail,
    action: 'ai_draft:approve',
    entity: 'AIDraft',
    entityId: draft._id.toString(),
    after: {
      draftId: draft._id.toString(),
      assignmentId: assignment._id.toString(),
      questionCount: draft.generatedContent.questions.length,
      topic: draft.requestParams.topic,
    },
  })

  return { draft, assignmentId: assignment._id.toString() }
}

export interface ListDraftsFilters {
  status?: AIDraftStatus
  page?: number
  limit?: number
}

export async function listTeacherDrafts(
  schoolId: string,
  teacherUserId: string,
  filters: ListDraftsFilters = {},
): Promise<{ drafts: IAIDraft[]; total: number; page: number; limit: number; totalPages: number }> {
  const { status, page = 1, limit = 20 } = filters

  const query: Record<string, unknown> = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
    teacherId: new mongoose.Types.ObjectId(teacherUserId),
  }
  if (status) query.status = status

  const total = await AIDraft.countDocuments(query)
  const drafts = await AIDraft.find(query)
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('publishedAssignmentId', '_id title status')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return { drafts, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

export async function getDraftById(
  schoolId: string,
  draftId: string,
  actorUserId: string,
  actorRoles: string[],
): Promise<IAIDraft | null> {
  const draft = await AIDraft.findOne({
    _id: draftId,
    schoolId: new mongoose.Types.ObjectId(schoolId),
  })
    .populate('teacherId', 'profile.firstName profile.lastName')
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('publishedAssignmentId', '_id title status')

  if (!draft) return null

  const isOwner = draft.teacherId && draft.teacherId._id.toString() === actorUserId
  const isSchoolAdmin = actorRoles.includes('school_admin')

  if (!isOwner && !isSchoolAdmin) return null

  return draft
}

async function findAccessibleDraft(
  schoolId: string,
  draftId: string,
  teacherUserId: string,
  allowedStatuses: AIDraftStatus[],
): Promise<IAIDraft | null> {
  const draft = await AIDraft.findOne({
    _id: draftId,
    schoolId: new mongoose.Types.ObjectId(schoolId),
    teacherId: new mongoose.Types.ObjectId(teacherUserId),
    status: { $in: allowedStatuses },
  })
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('publishedAssignmentId', '_id title status')

  if (!draft) return null
  // Defensive re-check: keeps status rules enforced even if the storage layer
  // (or a test double) does not apply the $in filter.
  if (!allowedStatuses.includes(draft.status)) return null
  return draft
}

function normalizeQuestions(questions: unknown[], allowedTypes: string[]): IQuestion[] {
  const allowed = new Set(allowedTypes)
  if (!Array.isArray(questions)) return []

  const out: IQuestion[] = []
  for (const item of questions) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>

    const question = typeof rec.question === 'string' ? rec.question.trim() : ''
    const type = typeof rec.type === 'string' ? rec.type : 'short_answer'
    if (!question || !allowed.has(type)) continue

    let options: string[] | undefined
    if (Array.isArray(rec.options)) {
      const filtered = rec.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      if (filtered.length > 0) options = filtered
    }

    const correctAnswer = typeof rec.correctAnswer === 'string' ? rec.correctAnswer.trim() : ''
    const explanation = typeof rec.explanation === 'string' ? rec.explanation.trim() : ''
    if (!correctAnswer || !explanation) continue

    out.push({
      question,
      type: type as IQuestion['type'],
      options,
      correctAnswer,
      explanation,
    })
  }
  return out
}

function buildAssignmentDescription(questions: IQuestion[]): string {
  const lines: string[] = ['Generated Quiz Draft — review before publishing.\n']
  questions.forEach((q, idx) => {
    lines.push(`Q${idx + 1}. ${q.question}`)
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => lines.push(`   - ${opt}`))
    }
    lines.push(`   Type: ${q.type} | Explanation: ${q.explanation}`)
    lines.push('')
  })
  lines.push(`Total questions: ${questions.length}`)
  return lines.join('\n')
}

export { quizGenerateSchema, patchQuestionsSchema }
