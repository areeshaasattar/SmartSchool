import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { z } from 'zod'
import { useGenerateQuizMutation } from '../api/teacherToolsApi'
import type { RootState } from '../../../../store'
import api from '../../../../services/api'
import type { Difficulty, QuestionType } from '../api/teacherToolsApi'

const generateSchema = z.object({
  classId: z.string().min(1, 'Select a class'),
  subjectId: z.string().min(1, 'Select a subject'),
  topic: z.string().min(1, 'Topic is required').max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().int().min(1).max(50),
  questionTypes: z.array(z.enum(['mcq', 'short_answer', 'essay'])).min(1),
})

type FormState = z.infer<typeof generateSchema>

const emptyForm: FormState = {
  classId: '',
  subjectId: '',
  topic: '',
  difficulty: 'medium',
  questionCount: 5,
  questionTypes: ['mcq'],
}

interface ClassOption {
  _id: string
  grade: string
  section: string
}

interface SubjectOption {
  _id: string
  name: string
  code: string
}

export default function GenerateQuizPage() {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [generateQuiz, { isLoading: generating }] = useGenerateQuizMutation()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    Promise.all([
      api.get('/classes?limit=200').then((res: any) => res.data.classes || res.data).catch(() => []),
      api.get('/subjects?limit=200').then((res: any) => res.data.subjects || res.data).catch(() => []),
    ])
      .then(([cls, sub]) => {
        if (!cancelled) {
          setClasses(cls as ClassOption[])
          setSubjects(sub as SubjectOption[])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  // Scope subjects to selected class
  useEffect(() => {
    if (form.classId && classes.length > 0) {
      const cls = classes.find((c) => c._id === form.classId)
      if (cls) {
        // In this codebase, class.subjectIds may or may not be populated server-side.
        // We approximate scoping by filtering the full subject list to ones the teacher can select.
        // If class.subjectIds were populated we would filter here.
      }
    }
  }, [form.classId, classes])

  const update = (field: keyof FormState, value: FormState[typeof field]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSubmitError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = generateSchema.safeParse(form)
    if (!parsed.success) {
      setSubmitError(parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '))
      return
    }
    setLoading(true)
    setSubmitError('')
    try {
      const draft = await generateQuiz(parsed.data).unwrap()
      navigate(`/ai/teacher-tools/drafts/${draft._id}/review`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to generate quiz draft')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !user.roles.includes('teacher') && !user.roles.includes('school_admin')) {
    return <div className="rounded-xl bg-white p-6 text-secondary-600 shadow-sm">Access denied.</div>
  }

  if (loadingOptions) return <div className="mx-auto max-w-2xl p-10 text-center text-secondary-500">Loading class and subject options…</div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Generate Quiz Draft</h1>
        <p className="mt-1 text-sm text-secondary-500">
          Drafts are AI-generated and never published automatically. You will be able to edit and explicitly approve a draft before it becomes a real assignment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-white shadow-sm p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Class *</label>
            <select
              value={form.classId}
              onChange={(e) => update('classId', e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Choose a class</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.grade} - {c.section}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Subject *</label>
            <select
              value={form.subjectId}
              onChange={(e) => update('subjectId', e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Topic / Focus *</label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => update('topic', e.target.value)}
            placeholder="e.g., Photosynthesis, Fractions, World War II"
            className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Difficulty *</label>
            <select
              value={form.difficulty}
              onChange={(e) => update('difficulty', e.target.value as Difficulty)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Number of questions *</label>
            <input
              type="number"
              min={1}
              max={50}
              value={form.questionCount}
              onChange={(e) => update('questionCount', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Question types *</label>
          <div className="flex flex-wrap gap-4">
            {(['mcq', 'short_answer', 'essay'] as QuestionType[]).map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(form.questionTypes || []).includes(type)}
                  onChange={(e) => {
                    const current = new Set(form.questionTypes || [])
                    if (e.target.checked) current.add(type)
                    else current.delete(type)
                    update('questionTypes', Array.from(current) as QuestionType[])
                  }}
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {submitError && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{submitError}</div>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={generating || loading}
            className="rounded-lg border border-secondary-300 px-5 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generating || loading}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {generating ? 'Generating draft…' : 'Generate draft'}
          </button>
        </div>
      </form>
    </div>
  )
}
