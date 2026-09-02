import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../../services/api'

interface SubjectOption { _id: string; name: string; code: string }
interface ClassOption { _id: string; grade: string; section: string }

interface ScheduleEntry {
  subjectId: string
  date: string
  startTime: string
  endTime: string
  maxMarks: number
  passMarks: number
}

export default function ExamSetupPage() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')

  const [form, setForm] = useState({
    name: '',
    term: '',
    classIds: [] as string[],
    schedule: [] as ScheduleEntry[],
  })

  useEffect(() => {
    Promise.all([
      api.get('/classes?limit=100'),
      api.get('/subjects'),
      api.get('/schools/current'),
    ]).then(([classRes, subRes, schoolRes]) => {
      setClasses(classRes.data.classes || classRes.data)
      setSubjects(subRes.data)
      const school = schoolRes.data
      const current = school?.academicYears?.find((y: { isCurrent: boolean }) => y.isCurrent)
      if (current) setAcademicYearId(current._id)
    }).catch(() => { /* silent */ })
  }, [])

  const addScheduleEntry = () => {
    setForm({
      ...form,
      schedule: [...form.schedule, { subjectId: '', date: '', startTime: '09:00', endTime: '10:00', maxMarks: 100, passMarks: 40 }],
    })
  }

  const updateScheduleEntry = (idx: number, field: keyof ScheduleEntry, value: string | number) => {
    const updated = [...form.schedule]
    updated[idx] = { ...updated[idx], [field]: value }
    setForm({ ...form, schedule: updated })
  }

  const removeScheduleEntry = (idx: number) => {
    setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== idx) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/exams', {
        ...form,
        academicYearId,
      })
      navigate('/exams')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create exam')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Create Exam</h2>
        <Link to="/exams" className="text-sm text-primary-700 hover:underline">← Back</Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Exam Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="e.g. Mid-Term Examination" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Term *</label>
            <input type="text" required value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="e.g. Term 1" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Classes *</label>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <label key={c._id} className="flex items-center gap-1.5 rounded-lg border border-secondary-300 px-3 py-2 text-sm cursor-pointer hover:bg-secondary-50">
                <input type="checkbox" checked={form.classIds.includes(c._id)}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      classIds: e.target.checked
                        ? [...form.classIds, c._id]
                        : form.classIds.filter((id) => id !== c._id),
                    })
                  }} />
                {c.grade} - {c.section}
              </label>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-secondary-700">Exam Schedule</label>
            <button type="button" onClick={addScheduleEntry}
              className="text-xs text-primary-700 hover:underline">+ Add Subject</button>
          </div>

          {form.schedule.length === 0 && (
            <p className="text-sm text-secondary-400">No schedule entries. Click "Add Subject" to define exam schedule.</p>
          )}

          <div className="space-y-3">
            {form.schedule.map((entry, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-secondary-200 p-3">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-secondary-600 mb-1">Subject</label>
                  <select required value={entry.subjectId} onChange={(e) => updateScheduleEntry(idx, 'subjectId', e.target.value)}
                    className="w-full rounded border border-secondary-300 px-2 py-1.5 text-xs">
                    <option value="">Select</option>
                    {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Date</label>
                  <input type="date" required value={entry.date} onChange={(e) => updateScheduleEntry(idx, 'date', e.target.value)}
                    className="rounded border border-secondary-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Start</label>
                  <input type="time" required value={entry.startTime} onChange={(e) => updateScheduleEntry(idx, 'startTime', e.target.value)}
                    className="rounded border border-secondary-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">End</label>
                  <input type="time" required value={entry.endTime} onChange={(e) => updateScheduleEntry(idx, 'endTime', e.target.value)}
                    className="rounded border border-secondary-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Max</label>
                  <input type="number" required min={1} value={entry.maxMarks}
                    onChange={(e) => updateScheduleEntry(idx, 'maxMarks', parseInt(e.target.value) || 100)}
                    className="w-16 rounded border border-secondary-300 px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-xs text-secondary-600 mb-1">Pass</label>
                  <input type="number" required min={0} value={entry.passMarks}
                    onChange={(e) => updateScheduleEntry(idx, 'passMarks', parseInt(e.target.value) || 40)}
                    className="w-16 rounded border border-secondary-300 px-2 py-1.5 text-xs" />
                </div>
                <button type="button" onClick={() => removeScheduleEntry(idx)}
                  className="text-xs text-red-600 hover:underline pb-1">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Exam'}
          </button>
          <button type="button" onClick={() => navigate('/exams')}
            className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
