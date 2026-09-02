import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../../services/api'

interface FormData {
  classId: string
  subjectId: string
  title: string
  description: string
  dueDate: string
  maxMarks: number
  academicYearId: string
}

interface SubjectOption { _id: string; name: string; code: string }
interface ClassOption { _id: string; grade: string; section: string }

export default function AssignmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])

  const [form, setForm] = useState<FormData>({
    classId: searchParams.get('classId') || '',
    subjectId: '',
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100,
    academicYearId: '',
  })

  useEffect(() => {
    Promise.all([
      api.get('/classes?limit=100'),
      api.get('/subjects'),
    ]).then(([classRes, subRes]) => {
      setClasses(classRes.data.classes || classRes.data)
      setSubjects(subRes.data)
    }).catch(() => { /* silent */ })

    // Auto-select current academic year
    api.get('/schools/current').then((res) => {
      const school = res.data
      const current = school?.academicYears?.find((y: { isCurrent: boolean }) => y.isCurrent)
      if (current) setForm((f) => ({ ...f, academicYearId: current._id }))
    }).catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/assignments/${id}`).then((res) => {
        const a = res.data
        setForm({
          classId: a.classId?._id || a.classId,
          subjectId: a.subjectId?._id || a.subjectId,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : '',
          maxMarks: a.maxMarks,
          academicYearId: a.academicYearId?._id || a.academicYearId || '',
        })
      }).catch(() => setError('Failed to load assignment'))
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        dueDate: new Date(form.dueDate).toISOString(),
      }
      if (isEdit) {
        await api.patch(`/assignments/${id}`, payload)
      } else {
        await api.post('/assignments', payload)
      }
      navigate('/assignments')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save assignment'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">
        {isEdit ? 'Edit Assignment' : 'New Assignment'}
      </h2>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Class *</label>
            <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Select class</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Subject *</label>
            <select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Title *</label>
          <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Assignment title" />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Description *</label>
          <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Assignment description and instructions" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Due Date *</label>
            <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Max Marks *</label>
            <input type="number" required min={1} value={form.maxMarks}
              onChange={(e) => setForm({ ...form, maxMarks: parseInt(e.target.value) || 100 })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Assignment' : 'Create Assignment'}
          </button>
          <button type="button" onClick={() => navigate('/assignments')}
            className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
