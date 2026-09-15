import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ROLE_GUARDS_ENABLED } from '../../../../app/accessControl'
import { z } from 'zod'
import {
  useGetDraftQuery,
  usePatchDraftMutation,
  useDiscardDraftMutation,
  useApproveDraftMutation,
  type Question,
  type QuestionType,
} from '../api/teacherToolsApi'
import type { RootState } from '../../../../store'
import api from '../../../../services/api'

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

interface ReviewState {
  draft: ReturnType<typeof useGetDraftQuery> extends { data: { getNever: () => unknown } } ? never : NonNullable<Awaited<ReturnType<typeof useGetDraftQuery>['data']>>
  loadingOptions: boolean
  classes: { _id: string; grade: string; section: string }[]
  subjects: { _id: string; name: string; code: string }[]
  academicYears: { _id: string; name: string }[]
}

const emptyQuestion: Question = {
  question: '',
  type: 'mcq',
  options: [],
  correctAnswer: '',
  explanation: '',
}

export default function DraftReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const { data: draft, isLoading, error } = useGetDraftQuery(id ?? '', { skip: !id })
  const [patchDraft, { isLoading: patching }] = usePatchDraftMutation()
  const [discardDraft, { isLoading: discarding }] = useDiscardDraftMutation()
  const [approveDraft, { isLoading: approving }] = useApproveDraftMutation()

  const [state, setState] = useState<ReviewState>({
    draft: null as unknown as ReviewState['draft'],
    loadingOptions: true,
    classes: [],
    subjects: [],
    academicYears: [],
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [submitError, setSubmitError] = useState('')
  const [approvingStep, setApprovingStep] = useState<'idle' | 'confirm' | 'publishing'>('idle')
  const [approveErrors, setApproveErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      api.get('/classes?limit=200').then((res: any) => res.data.classes || res.data).catch(() => []),
      api.get('/subjects?limit=200').then((res: any) => res.data.subjects || res.data).catch(() => []),
      api.get('/academic-years?limit=200').then((res: any) => res.data.academicYears || res.data).catch(() => []),
    ])
      .then(([cls, sub, years]) => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loadingOptions: false,
            classes: cls as ReviewState['classes'],
            subjects: sub as ReviewState['subjects'],
            academicYears: years as ReviewState['academicYears'],
          }))
        }
      })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (draft) {
      setQuestions((draft.generatedContent?.questions || []).map((q) => ({ ...q })))
      setApprovingStep('idle')
    }
  }, [draft])

  // Role guard bypassed in development (see app/accessControl.ts)
  if (ROLE_GUARDS_ENABLED && (!user || (!user.roles.includes('teacher') && !user.roles.includes('school_admin')))) {
    return <div className="rounded-xl bg-white p-6 text-secondary-600 shadow-sm">Access denied.</div>
  }

  if (isLoading) return <div className="mx-auto max-w-3xl p-10 text-center text-secondary-500">Loading draft…</div>
  if (error || !draft) return <div className="mx-auto max-w-3xl p-10 text-center text-red-600">Draft not found or access denied.</div>
  if (state.loadingOptions) return <div className="mx-auto max-w-3xl p-10 text-center text-secondary-500">Loading options…</div>

  const statusLabel = {
    generated: 'AI-Generated Draft — Not Yet Published',
    edited: 'Draft Edited — Not Yet Published',
    approved: 'Published',
    discarded: 'Discarded',
  } as const

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => {
      const next = prev.map((q) => (index === prev.indexOf(q) ? { ...q, ...patch } : q))
      return next
    })
    setSubmitError('')
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...emptyQuestion, type: 'mcq' }])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEdits = async () => {
    const parsed = patchSchema.safeParse({ questions })
    if (!parsed.success) {
      setSubmitError(parsed.error.errors.map((e) => e.message).join('; '))
      return
    }
    if (!id) {
      setSubmitError('Draft id is missing.')
      return
    }
    try {
      const updated = await patchDraft({ id, body: { questions: parsed.data.questions } }).unwrap()
      setQuestions(updated.generatedContent?.questions.map((q) => ({ ...q })) || [])
      setSubmitError('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save edits')
    }
  }

  const handleDiscard = async () => {
    if (!id) {
      setSubmitError('Draft id is missing.')
      return
    }
    if (!confirm('Discard this draft? It will remain in your history but will not be published.')) return
    try {
      await discardDraft(id).unwrap()
      navigate('/ai/teacher-tools/drafts')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to discard draft')
    }
  }

  const startApprove = () => {
    setApprovingStep('confirm')
    setApproveErrors({})
  }

  const handleApprove = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) {
      setApproveErrors({ general: 'Draft id is missing.' })
      return
    }
    const form = new FormData(event.target as HTMLFormElement)
    const title = (form.get('title') as string) || undefined
    const dueDate = form.get('dueDate') as string
    const maxMarks = parseInt(form.get('maxMarks') as string || '0', 10)
    const academicYearId = form.get('academicYearId') as string

    if (!dueDate) setApproveErrors((prev) => ({ ...prev, dueDate: 'Due date is required' }))
    if (!maxMarks || maxMarks < 1) setApproveErrors((prev) => ({ ...prev, maxMarks: 'Max marks must be at least 1' }))
    if (!academicYearId) setApproveErrors((prev) => ({ ...prev, academicYearId: 'Academic year is required' }))
    if (Object.keys(approveErrors).length) return

    setApprovingStep('publishing')
    try {
      const result = await approveDraft({ id, body: { title, dueDate, maxMarks, academicYearId } }).unwrap()
      navigate(`/assignments/${result.assignmentId}`)
    } catch (err) {
      setApproveErrors({ general: err instanceof Error ? err.message : 'Failed to publish assignment' })
      setApprovingStep('confirm')
    }
  }

  const canEdit = draft.status === 'generated' || draft.status === 'edited'
  const canApprove = draft.status === 'generated' || draft.status === 'edited'
  const canDiscard = draft.status === 'generated' || draft.status === 'edited'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Review Draft</h1>
          <p className="mt-1 text-sm text-secondary-500">{statusLabel[draft.status]}</p>
        </div>
        <button
          onClick={() => navigate('/ai/teacher-tools/drafts')}
          className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
        >
          Back to drafts
        </button>
      </div>

      {submitError && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{submitError}</div>}

      <div className="rounded-xl bg-white shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900">{draft.requestParams.topic}</h2>
          <div className="mt-1 text-sm text-secondary-600">
            Class: {draft.classId?.grade ?? draft.classId?._id} - {draft.classId?.section ?? ''}
            {' · Subject: '}
            {draft.subjectId?.name ?? draft.subjectId?._id}
            {' · Difficulty: '}
            {draft.requestParams.difficulty}
            {' · Types: '}
            {draft.requestParams.questionTypes.join(', ')}
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="rounded-lg border border-secondary-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-secondary-500">Question {index + 1}</span>
                <div className="flex gap-2">
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(index, { type: e.target.value as QuestionType })}
                    disabled={!canEdit}
                    className="rounded border border-secondary-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="mcq">MCQ</option>
                    <option value="short_answer">Short answer</option>
                    <option value="essay">Essay</option>
                  </select>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={question.question}
                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                disabled={!canEdit}
                rows={2}
                className="w-full resize-none rounded border border-secondary-300 px-3 py-2 text-sm disabled:opacity-50"
                placeholder="Question text"
              />

              {question.type === 'mcq' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-secondary-600">Options</label>
                  {question.options && question.options.length > 0
                    ? question.options.map((opt, oi) => (
                        <div key={oi} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...(question.options || [])]
                              next[oi] = e.target.value
                              updateQuestion(index, { options: next })
                            }}
                            disabled={!canEdit}
                            className="flex-1 rounded border border-secondary-300 px-3 py-2 text-sm disabled:opacity-50"
                          />
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = (question.options || []).filter((_, i) => i !== oi)
                                updateQuestion(index, { options: next })
                              }}
                              className="text-xs text-red-600 hover:underline disabled:hidden"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    : canEdit ? (
                      <button
                        type="button"
                        onClick={() => updateQuestion(index, { options: ['Option A', 'Option B', 'Option C', 'Option D'] })}
                        className="text-sm text-primary-700 hover:underline"
                      >
                        + Add options (MCQ)
                      </button>
                    ) : null}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-secondary-600 mb-1">Correct answer</label>
                  <input
                    type="text"
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                    disabled={!canEdit}
                    className="w-full rounded border border-secondary-300 px-3 py-2 text-sm disabled:opacity-50"
                    placeholder="Correct answer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-600 mb-1">Explanation</label>
                  <input
                    type="text"
                    value={question.explanation}
                    onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                    disabled={!canEdit}
                    className="w-full rounded border border-secondary-300 px-3 py-2 text-sm disabled:opacity-50"
                    placeholder="Explanation for teacher"
                  />
                </div>
              </div>
            </div>
          ))}

          {canEdit && (
            <button
              type="button"
              onClick={addQuestion}
              className="text-sm text-primary-700 hover:underline"
            >
              + Add question
            </button>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveEdits}
              disabled={patching}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {patching ? 'Saving…' : 'Save edits'}
            </button>
          </div>
        )}

        {canDiscard && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={discarding}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {discarding ? 'Discarding…' : 'Discard draft'}
            </button>
          </div>
        )}
      </div>

      {draft.status === 'approved' && draft.publishedAssignmentId && (
        <div className="rounded-xl bg-green-50 p-5 text-sm text-green-800">
          This draft was published as assignment{' '}
          <a href={`/assignments/${draft.publishedAssignmentId}`} className="font-semibold underline">
            {draft.publishedAssignmentId}
          </a>
        </div>
      )}

      {draft.status === 'discarded' && (
        <div className="rounded-xl bg-secondary-100 p-5 text-sm text-secondary-700">
          This draft has been discarded and will not be published.
        </div>
      )}

      {canApprove && (
        <div className="rounded-xl bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-secondary-900">Publish as Assignment</h2>
          <p className="text-sm text-secondary-600">
            Publishing creates a real assignment that students can see and submit. This step is explicit and cannot be undone automatically.
          </p>

          {approvingStep === 'idle' && (
            <button
              type="button"
              onClick={startApprove}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Publish as Assignment to {draft.classId?.grade} {draft.classId?.section}
            </button>
          )}

          {approvingStep === 'confirm' && (
            <form onSubmit={handleApprove} className="space-y-4">
              <div className="rounded-lg border border-secondary-200 p-4 text-sm text-secondary-700">
                <p className="font-medium text-secondary-900">Confirm publishing details</p>
                <p className="mt-1">
                  Class: {draft.classId?.grade} {draft.classId?.section} · Subject: {draft.subjectId?.name}
                </p>
                <p className="mt-1">Questions: {questions.length}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={`Quiz: ${draft.requestParams.topic}`}
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Max marks</label>
                  <input
                    type="number"
                    name="maxMarks"
                    min={1}
                    defaultValue={questions.length}
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Due date *</label>
                  <input
                    type="datetime-local"
                    name="dueDate"
                    defaultValue={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  {approveErrors.dueDate && <p className="mt-1 text-xs text-red-600">{approveErrors.dueDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Academic year *</label>
                  <select
                    name="academicYearId"
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Choose academic year</option>
                    {state.academicYears.map((y) => (
                      <option key={y._id} value={y._id}>{y.name}</option>
                    ))}
                  </select>
                  {approveErrors.academicYearId && <p className="mt-1 text-xs text-red-600">{approveErrors.academicYearId}</p>}
                </div>
              </div>

              {approveErrors.general && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{approveErrors.general}</div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApprovingStep('idle')}
                  className="rounded-lg border border-secondary-300 px-5 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {approving ? 'Publishing…' : 'Publish assignment'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
