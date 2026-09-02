import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface Student {
  _id: string
  admissionNo: string
  profile: { firstName: string; lastName: string }
}

export default function DisciplineCreatePage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<'behavior' | 'academic_integrity' | 'attendance' | 'other'>('behavior')
  const [severity, setSeverity] = useState<'minor' | 'moderate' | 'major'>('minor')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/students?limit=200')
      .then((res) => setStudents(res.data.students || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/discipline', {
        studentId,
        incidentDate,
        category,
        severity,
        description,
        actionTaken: actionTaken || undefined,
      })
      navigate('/discipline')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create discipline record'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Create Incident Report</h1>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-lg">
        {/* Student */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Student</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="">Select a student</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.profile.firstName} {s.profile.lastName} ({s.admissionNo})
              </option>
            ))}
          </select>
        </div>

        {/* Incident Date */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Incident Date</label>
          <input
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          />
        </div>

        {/* Category & Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="behavior">Behavior</option>
              <option value="academic_integrity">Academic Integrity</option>
              <option value="attendance">Attendance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="major">Major</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            placeholder="Describe the incident..."
          />
        </div>

        {/* Action Taken */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Action Taken (optional)</label>
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            placeholder="Describe any action taken..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/discipline')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !studentId || !description}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  )
}
