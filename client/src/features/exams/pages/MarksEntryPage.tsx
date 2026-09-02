import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Exam {
  _id: string
  name: string
  schedule: { subjectId: { _id: string; name: string }; maxMarks: number; passMarks: number }[]
  classIds: { _id: string; grade: string; section: string }[]
}

interface Student {
  _id: string
  admissionNo: string
  profile: { firstName: string; lastName: string }
}

export default function MarksEntryPage() {
  const { id: examId } = useParams<{ id: string }>()
  const [exam, setExam] = useState<Exam | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!examId) return
    api.get(`/exams/${examId}`).then((res) => setExam(res.data)).catch(() => setError('Failed to load exam'))
  }, [examId])

  // Load students when class is selected
  const loadStudents = useCallback(async () => {
    if (!selectedClassId) { setStudents([]); return }
    setLoading(true)
    try {
      const res = await api.get(`/classes/${selectedClassId}/roster`)
      setStudents(res.data.students || [])
      // Initialize marks from existing data if available
      const initial: Record<string, number> = {}
      ;(res.data.students || []).forEach((s: Student) => { initial[s._id] = 0 })
      setMarks(initial)
    } catch {
      setError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => { loadStudents() }, [loadStudents])

  const scheduleEntry = exam?.schedule.find((s) => {
    const subjectId = typeof s.subjectId === 'object' ? s.subjectId._id : s.subjectId
    return subjectId === selectedSubjectId
  })

  const handleSave = async () => {
    if (!examId || !selectedClassId || !selectedSubjectId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const entries = Object.entries(marks).map(([studentId, marksObtained]) => ({
        studentId,
        marksObtained,
      })).filter((e) => e.marksObtained > 0)

      await api.post(`/exams/${examId}/marks`, {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        entries,
      })
      setSuccess(`Marks saved for ${entries.length} students`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Marks Entry</h2>
          <p className="text-sm text-secondary-500">{exam?.name}</p>
        </div>
        <Link to="/exams" className="text-sm text-primary-700 hover:underline">← Back</Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Class *</label>
          <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setMarks({}) }}
            className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
            <option value="">Select class</option>
            {exam?.classIds.map((c) => (
              <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Subject *</label>
          <select value={selectedSubjectId} onChange={(e) => { setSelectedSubjectId(e.target.value); setMarks({}) }}
            className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none">
            <option value="">Select subject</option>
            {exam?.schedule.map((s, idx) => {
              const sub = typeof s.subjectId === 'object' ? s.subjectId : null
              return <option key={idx} value={sub?._id || String(s.subjectId)}>{sub?.name} (Max: {s.maxMarks})</option>
            })}
          </select>
        </div>
      </div>

      {selectedClassId && selectedSubjectId && (
        <>
          {scheduleEntry && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              Max Marks: {scheduleEntry.maxMarks} | Pass Marks: {scheduleEntry.passMarks}
            </div>
          )}

          {loading ? (
            <div className="text-center text-secondary-500 py-8">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-center text-secondary-500 py-8">No students in this class.</div>
          ) : (
            <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-secondary-700">Admission No</th>
                    <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                    <th className="px-4 py-3 font-medium text-secondary-700 w-32">Marks Obtained</th>
                    <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {students.map((s) => {
                    const obtained = marks[s._id] || 0
                    const maxMarks = scheduleEntry?.maxMarks || 100
                    const passMarks = scheduleEntry?.passMarks || 40
                    return (
                      <tr key={s._id} className="hover:bg-secondary-50">
                        <td className="px-4 py-3 font-mono text-secondary-600">{s.admissionNo}</td>
                        <td className="px-4 py-3 font-medium text-secondary-900">
                          {s.profile.firstName} {s.profile.lastName}
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min={0} max={maxMarks}
                            value={marks[s._id] || ''}
                            onChange={(e) => setMarks({ ...marks, [s._id]: parseInt(e.target.value) || 0 })}
                            className="w-24 rounded border border-secondary-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" />
                        </td>
                        <td className="px-4 py-3">
                          {obtained > 0 ? (
                            <span className={`text-xs font-medium ${obtained >= passMarks ? 'text-green-600' : 'text-red-600'}`}>
                              {obtained >= passMarks ? 'Pass' : 'Fail'}
                            </span>
                          ) : (
                            <span className="text-xs text-secondary-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
