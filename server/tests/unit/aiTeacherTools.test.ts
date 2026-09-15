import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { Types } from 'mongoose'
import { AIDraft } from '../../src/modules/ai/teacher-tools/models/AIDraft'
import type { IAIDraft } from '../../src/modules/ai/teacher-tools/models/AIDraft'
import { Class } from '../../src/modules/classes/models/Class'
import { Subject } from '../../src/modules/classes/models/Subject'
import { Teacher } from '../../src/modules/teachers/models/Teacher'
import { writeAuditLog } from '../../src/modules/audit/models/AuditLog'
import { processAIRequest, AIServiceClientError } from '../../src/modules/ai/services/aiServiceClient'
import { createAssignment, isTeacherAssignedToClass } from '../../src/modules/assignments/services/assignmentService'
import * as draftService from '../../src/modules/ai/teacher-tools/services/draftService'

/* eslint-disable @typescript-eslint/no-explicit-any -- mock handles are intentionally loose */
type M = any

// ── mongoose mock: stable, tolerant ObjectId + inert Schema/model ────
jest.mock('mongoose', () => {
  const ObjectId = class ObjectId {
    _id: unknown
    private value: string
    constructor() {
      // Stable per-instance string so repeated toString() calls compare equal.
      this.value = 'mockid-' + Math.random().toString(36).slice(2, 10)
      this._id = this
    }
    toString() {
      return this.value
    }
    equals(other: unknown) {
      const o = typeof other === 'string' ? other : (other as { toString?: () => string } | undefined)?.toString?.()
      return typeof o === 'string' && this.toString() === o
    }
  }
  const Schema = class Schema {
    static Types = { ObjectId }
    index() {}
  }
  const M = class M {
    static findOne = jest.fn()
    static find = jest.fn()
    static create = jest.fn()
    static countDocuments = jest.fn()
    static findByIdAndUpdate = jest.fn()
  }
  const model = jest.fn(() => M)
  const db = { Types: { ObjectId }, Schema, model }
  return { ...db, default: db }
})

// ── Model & dependency mocks ─────────────────────────────────────────
jest.mock('../../src/modules/ai/teacher-tools/models/AIDraft.js', () => ({
  AIDraft: {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}))
jest.mock('../../src/modules/classes/models/Class.js', () => ({ Class: { findOne: jest.fn() } }))
jest.mock('../../src/modules/classes/models/Subject.js', () => ({ Subject: { findOne: jest.fn() } }))
jest.mock('../../src/modules/teachers/models/Teacher.js', () => ({ Teacher: { findOne: jest.fn() } }))
jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  writeAuditLog: jest.fn(),
  AuditLog: { create: jest.fn() },
}))
jest.mock('../../src/modules/ai/services/aiServiceClient.js', () => ({
  processAIRequest: jest.fn(),
  AIServiceClientError: class AIServiceClientError extends Error {
    constructor(message: string, public readonly statusCode = 502) {
      super(message)
    }
  },
}))
jest.mock('../../src/modules/assignments/services/assignmentService.js', () => ({
  isTeacherAssignedToClass: jest.fn(),
  createAssignment: jest.fn(),
}))

const mockClassFindOne = Class.findOne as unknown as M
const mockSubjectFindOne = Subject.findOne as unknown as M
const mockTeacherFindOne = Teacher.findOne as unknown as M
const mockIsAssigned = isTeacherAssignedToClass as unknown as M
const mockCreateAssignment = createAssignment as unknown as M
const mockWriteAuditLog = writeAuditLog as unknown as M
const mockProcessAIRequest = processAIRequest as unknown as M
const mockAIDraftCreate = AIDraft.create as unknown as M
const mockAIDraftFindOne = AIDraft.findOne as unknown as M
const mockAIDraftFind = AIDraft.find as unknown as M
const mockAIDraftCountDocuments = AIDraft.countDocuments as unknown as M

function makeId(): Types.ObjectId {
  return new Types.ObjectId()
}

/** findOne(...) chain: populate() × n, then awaiting resolves `value`. */
function findOneChain(value: unknown): any {
  const chain: any = {}
  chain.populate = jest.fn(() => chain)
  chain.then = (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(value).then(onFulfilled, onRejected)
  return chain
}

/** find(...) chain: populate/sort/skip return this; limit() resolves the array. */
function findChain(values: unknown[]): any {
  const chain: any = {}
  const self = () => chain
  chain.populate = jest.fn(self)
  chain.sort = jest.fn(self)
  chain.skip = jest.fn(self)
  chain.limit = jest.fn(() => Promise.resolve(values))
  return chain
}

function mockDraft(overrides: Record<string, any> = {}): IAIDraft {
  const draft: any = {
    _id: new Types.ObjectId(),
    schoolId: new Types.ObjectId(),
    teacherId: new Types.ObjectId(),
    classId: new Types.ObjectId(),
    subjectId: new Types.ObjectId(),
    draftType: 'quiz',
    requestParams: { topic: 'Photosynthesis', difficulty: 'easy', questionCount: 3, questionTypes: ['mcq'] },
    generatedContent: { questions: [] },
    status: 'generated',
    reviewedAt: null,
    publishedAssignmentId: null,
    save: jest.fn(() => Promise.resolve(true)),
    populate(this: any) {
      return this
    },
    ...overrides,
  }
  return draft as IAIDraft
}

describe('draftService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('generateQuizDraft', () => {
    const baseInput: Parameters<typeof draftService.generateQuizDraft>[0] = {
      schoolId: 's1',
      teacherUserId: 't1',
      classId: 'c1',
      subjectId: 'sub1',
      topic: 'Photosynthesis',
      difficulty: 'easy',
      questionCount: 3,
      questionTypes: ['mcq'],
    }

    it('throws when teacher is not assigned to the class', async () => {
      mockIsAssigned.mockResolvedValue(false)

      await expect(draftService.generateQuizDraft(baseInput)).rejects.toThrow('not assigned to this class')
    })

    it('throws when AI returns empty questions', async () => {
      mockIsAssigned.mockResolvedValue(true)
      mockTeacherFindOne.mockResolvedValue({ _id: makeId() })
      mockClassFindOne.mockResolvedValue({ _id: makeId() })
      mockSubjectFindOne.mockResolvedValue({ _id: makeId() })
      mockProcessAIRequest.mockResolvedValue({ status: 'ok', result: { questions: [] } })

      await expect(draftService.generateQuizDraft(baseInput)).rejects.toThrow('empty or invalid question set')
    })

    it('throws when AI request fails', async () => {
      mockIsAssigned.mockResolvedValue(true)
      mockTeacherFindOne.mockResolvedValue({ _id: makeId() })
      mockClassFindOne.mockResolvedValue({ _id: makeId() })
      mockSubjectFindOne.mockResolvedValue({ _id: makeId() })
      mockProcessAIRequest.mockRejectedValueOnce(new AIServiceClientError('Service unavailable'))

      await expect(draftService.generateQuizDraft(baseInput)).rejects.toThrow('Service unavailable')
    })

    it('normalizes AI output and persists a draft with status generated', async () => {
      mockIsAssigned.mockResolvedValue(true)
      const schoolId = makeId()
      const classId = makeId()
      const subjectId = makeId()
      mockTeacherFindOne.mockResolvedValue({ _id: makeId(), userId: 'teacher1', schoolId })
      mockClassFindOne.mockResolvedValue({ _id: classId, schoolId })
      mockSubjectFindOne.mockResolvedValue({ _id: subjectId, schoolId })
      mockProcessAIRequest.mockResolvedValue({
        status: 'ok',
        result: {
          questions: [
            { question: 'What is 2+2?', type: 'mcq', options: ['3', '4', '5'], correctAnswer: '4', explanation: 'Basic arithmetic' },
          ],
        },
      })
      mockAIDraftCreate.mockImplementation(async (data: Record<string, unknown>) => ({ ...data }) as unknown as IAIDraft)

      const draft = await draftService.generateQuizDraft({
        ...baseInput,
        schoolId: schoolId.toString(),
        teacherUserId: 'teacher1',
        classId: classId.toString(),
        subjectId: subjectId.toString(),
        topic: 'Basic Math',
        questionCount: 1,
      })

      expect(draft.status).toBe('generated')
      expect(draft.requestParams.topic).toBe('Basic Math')
      expect(draft.generatedContent.questions).toHaveLength(1)
      expect(draft.generatedContent.questions[0].correctAnswer).toBe('4')
      expect(mockAIDraftCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestParams: { topic: 'Basic Math', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] },
        }),
      )
    })

    it('normalizes malformed AI output and keeps only valid questions', async () => {
      mockIsAssigned.mockResolvedValue(true)
      const schoolId = makeId()
      mockTeacherFindOne.mockResolvedValue({ _id: makeId() })
      mockClassFindOne.mockResolvedValue({ _id: makeId() })
      mockSubjectFindOne.mockResolvedValue({ _id: makeId() })
      mockProcessAIRequest.mockResolvedValue({
        status: 'ok',
        result: {
          questions: [
            { question: 'Valid?', type: 'mcq', options: ['A', 'B'], correctAnswer: 'A', explanation: 'ok' },
            { question: '', type: 'mcq', correctAnswer: 'A', explanation: 'ok' },
            { question: 'Bad type', type: 'unknown', correctAnswer: 'A', explanation: 'ok' },
            { question: 'Missing answer', type: 'short_answer', explanation: 'ok' },
          ],
        },
      })
      mockAIDraftCreate.mockImplementation(async (data: Record<string, unknown>) => ({ ...data }) as unknown as IAIDraft)

      const draft = await draftService.generateQuizDraft({
        ...baseInput,
        schoolId: schoolId.toString(),
        teacherUserId: 'teacher1',
        classId: makeId().toString(),
        subjectId: makeId().toString(),
        topic: 'Tricky',
        questionCount: 4,
        questionTypes: ['mcq', 'short_answer', 'essay'],
      })

      expect(draft.generatedContent.questions).toHaveLength(1)
      expect(draft.generatedContent.questions[0].question).toBe('Valid?')
    })
  })

  describe('patchDraftQuestions', () => {
    it('updates questions and sets status to edited', async () => {
      const draft = mockDraft({ status: 'generated', requestParams: { topic: 'T', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] } })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      const updated = await draftService.patchDraftQuestions({
        schoolId: draft.schoolId.toString(),
        draftId: draft._id.toString(),
        teacherUserId: 'teacher1',
        questions: [{ question: 'New Q', type: 'mcq', options: ['A', 'B'], correctAnswer: 'A', explanation: 'Note' }],
      })

      expect(updated.status).toBe('edited')
      expect(updated.generatedContent.questions).toHaveLength(1)
      expect(updated.generatedContent.questions[0].question).toBe('New Q')
      expect(draft.save).toHaveBeenCalled()
    })

    it('throws when patch would leave zero questions', async () => {
      const draft = mockDraft({ status: 'generated', requestParams: { topic: 'T', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] } })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      await expect(
        draftService.patchDraftQuestions({
          schoolId: draft.schoolId.toString(),
          draftId: draft._id.toString(),
          teacherUserId: 'teacher1',
          questions: [],
        }),
      ).rejects.toThrow('must contain at least one question')
    })

    it("returns not found for another teacher's draft", async () => {
      mockAIDraftFindOne.mockImplementation(() => findOneChain(null))

      await expect(
        draftService.patchDraftQuestions({
          schoolId: 's1',
          draftId: 'd1',
          teacherUserId: 'teacher1',
          questions: [{ question: 'Q', type: 'short_answer', correctAnswer: 'A', explanation: 'e' }],
        }),
      ).rejects.toThrow('not found or not editable')
    })
  })

  describe('discardDraft', () => {
    it('sets status discarded and never sets publishedAssignmentId', async () => {
      const draft = mockDraft({ status: 'generated' })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      const updated = await draftService.discardDraft({
        schoolId: draft.schoolId.toString(),
        draftId: draft._id.toString(),
        teacherUserId: 'teacher1',
      })

      expect(updated.status).toBe('discarded')
      expect(updated.publishedAssignmentId).toBeNull()
    })

    it("does not discard another teacher's draft", async () => {
      mockAIDraftFindOne.mockImplementation(() => findOneChain(null))

      await expect(
        draftService.discardDraft({ schoolId: 's1', draftId: 'd1', teacherUserId: 'teacher1' }),
      ).rejects.toThrow('not found or not discardable')
    })
  })

  describe('approveDraft', () => {
    it('creates an Assignment via the existing service function and links the draft', async () => {
      const schoolId = makeId()
      const classId = makeId()
      const subjectId = makeId()
      const draft = mockDraft({
        status: 'generated',
        schoolId,
        classId,
        subjectId,
        requestParams: { topic: 'Biology Quiz', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] },
        generatedContent: {
          questions: [{ question: 'What is a cell?', type: 'short_answer', correctAnswer: 'Basic unit of life', explanation: 'Biology 101' }],
        },
      })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      const assignmentId = makeId()
      const assignment = { _id: assignmentId, updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })) }
      mockCreateAssignment.mockResolvedValue(assignment)

      const result = await draftService.approveDraft({
        schoolId: schoolId.toString(),
        draftId: draft._id.toString(),
        teacherUserId: 'teacher1',
        title: 'Biology Quiz',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxMarks: 10,
        academicYearId: 'ay1',
        actorEmail: 'teacher@example.com',
      })

      expect(result.assignmentId).toBe(assignmentId.toString())
      expect(result.draft.status).toBe('approved')
      expect(result.draft.publishedAssignmentId?.toString()).toBe(assignmentId.toString())
      expect(mockCreateAssignment).toHaveBeenCalledWith(
        schoolId.toString(),
        expect.objectContaining({
          classId: classId.toString(),
          subjectId: subjectId.toString(),
          title: 'Biology Quiz',
          dueDate: expect.any(String),
          maxMarks: 10,
          academicYearId: 'ay1',
        }),
        'teacher1',
        'teacher@example.com',
      )
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ai_draft:approve', entity: 'AIDraft', actorEmail: 'teacher@example.com' }),
      )
    })

    it('rejects approving a discarded draft', async () => {
      const draft = mockDraft({ status: 'discarded' })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      await expect(
        draftService.approveDraft({
          schoolId: draft.schoolId.toString(),
          draftId: draft._id.toString(),
          teacherUserId: 'teacher1',
          dueDate: new Date().toISOString(),
          maxMarks: 5,
          academicYearId: 'ay1',
        }),
      ).rejects.toThrow('not found or not approvable')
    })

    it('does not allow another teacher to approve a draft', async () => {
      mockAIDraftFindOne.mockImplementation(() => findOneChain(null))

      await expect(
        draftService.approveDraft({
          schoolId: 's1',
          draftId: 'd1',
          teacherUserId: 'teacher1',
          dueDate: new Date().toISOString(),
          maxMarks: 5,
          academicYearId: 'ay1',
        }),
      ).rejects.toThrow('not found or not approvable')
    })
  })

  describe('scoping and visibility', () => {
    it("lists only the requesting teacher's drafts", async () => {
      const schoolId = makeId()
      const returnedDraft = mockDraft({
        schoolId,
        requestParams: { topic: 'T', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] },
        generatedContent: { questions: [] },
      })
      mockAIDraftFind.mockReturnValue(findChain([returnedDraft]))
      mockAIDraftCountDocuments.mockResolvedValue(1)

      const result = await draftService.listTeacherDrafts(schoolId.toString(), 'teacher1')

      expect(result.total).toBe(1)
      expect(result.drafts).toHaveLength(1)
    })

    it('allows school_admin to read any draft in the school', async () => {
      const schoolId = makeId()
      const draftId = makeId()
      const draft = mockDraft({
        _id: draftId,
        schoolId,
        teacherId: makeId(),
        requestParams: { topic: 'T', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] },
        generatedContent: { questions: [] },
      })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      const result = await draftService.getDraftById(schoolId.toString(), draftId.toString(), 'teacher1', ['school_admin'])
      expect(result).not.toBeNull()
    })

    it("prevents a teacher from reading another teacher's draft", async () => {
      const schoolId = makeId()
      const draftId = makeId()
      const draft = mockDraft({
        _id: draftId,
        schoolId,
        teacherId: makeId(),
        requestParams: { topic: 'T', difficulty: 'easy', questionCount: 1, questionTypes: ['mcq'] },
        generatedContent: { questions: [] },
      })
      mockAIDraftFindOne.mockImplementation(() => findOneChain(draft))

      const result = await draftService.getDraftById(schoolId.toString(), draftId.toString(), 'teacher1', ['teacher'])
      expect(result).toBeNull()
    })
  })
})
