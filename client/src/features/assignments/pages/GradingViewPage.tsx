import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Assignment {
  _id: string
  title: string
  maxMarks: number
  classId: { grade: string; section: string }
  subjectId: { name: string }
}

interface Submission {
  _id: string
  studentId: { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
  content: string
  attachments: { url: string; filename: string }[]
  submittedAt: string
  status: string
  marks?: number
  feedback?: string
  gradedAt?: string
}

export default function GradingViewPage() {
  const { id: assignmentId } = useParams<{ id: string }>()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeForm, setGradeForm] = useState({ marks: 0, feedback: '' })

  const loadData = useCallback(async () => {
    if (!assignmentId) return
    setLoading(true)
    try {
      const [assignRes, subRes] = await Promise.all([
        api.get(`/assignments/${assignmentId}`),
        api.get(`/assignments/${assignmentId}/submissions`),
      ])
      setAssignment(assignRes.data)
      setSubmissions(subRes.data)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [assignmentId])

  useEffect(() => { loadData() }, [loadData])

  const handleGrade = async (studentId: string) => {
    if (!assignmentId) return
    try {
      await api.patch(`/assignments/${assignmentId}/submissions/${studentId}`, gradeForm)
      setSuccess('Grade saved')
      setGradingId(null)
      loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to grade')
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      submitted: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
      graded: 'bg-blue-100 text-blue-700',
      not_submitted: 'bg-secondary-100 text-secondary-700',
    }
    return map[status] || 'bg-secondary-100 text-secondary-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Grading: {assignment?.title}</h2>
          <p className="text-sm text-secondary-500">
            {assignment?.classId?.grade} - {assignment?.classId?.section} | {assignment?.subjectId?.name} | Max: {assignment?.maxMarks}
          </p>
        </div>
        <Link to="/assignments" className="text-sm text-primary-700 hover:underline">← Back to Assignments</Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No submissions yet.</div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-secondary-700">Student</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Submitted</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Content</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Grade</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {submissions.map((s) => (
                <tr key={s._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-secondary-900">
                      {s.studentId?.profile.firstName} {s.studentId?.profile.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{s.studentId?.admissionNo}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {new Date(s.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-600 max-w-xs truncate">
                    {s.content || '—'}
                    {s.attachments?.length > 0 && (
                      <span className="ml-1 text-xs text-primary-600">({s.attachments.length} files)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === 'graded' ? (
                      <span className="font-medium text-secondary-900">
                        {s.marks}/{assignment?.maxMarks}
                        {s.feedback && <span className="block text-xs text-secondary-500 mt-0.5">{s.feedback}</span>}
                      </span>
                    ) : (
                      <span className="text-secondary-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {gradingId === s._id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          <input type="number" min={0} max={assignment?.maxMarks}
                            value={gradeForm.marks}
                            onChange={(e) => setGradeForm({ ...gradeForm, marks: parseInt(e.target.value) || 0 })}
                            className="w-20 rounded border border-secondary-300 px-2 py-1 text-xs" />
                          <span className="text-xs text-secondary-500 self-center">/ {assignment?.maxMarks}</span>
                        </div>
                        <input type="text" placeholder="Feedback (optional)"
                          value={gradeForm.feedback}
                          onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                          className="rounded border border-secondary-300 px-2 py-1 text-xs" />
                        <div className="flex gap-1">
                          <button onClick={() => handleGrade(s.studentId._id)}
                            className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
                          <button onClick={() => setGradingId(null)}
                            className="rounded border border-secondary-300 px-2 py-1 text-xs text-secondary-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setGradingId(s._id); setGradeForm({ marks: s.marks || 0, feedback: s.feedback || '' }) }}
                        className="text-xs text-primary-700 hover:underline">
                        {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
