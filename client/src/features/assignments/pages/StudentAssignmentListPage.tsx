import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface Assignment {
  _id: string
  title: string
  description: string
  classId: { _id: string; grade: string; section: string }
  subjectId: { name: string; code: string }
  dueDate: string
  maxMarks: number
  status: string
}

interface SubmissionStatus {
  assignmentId: string
  status: string
  marks?: number
}

export default function StudentAssignmentListPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissionStatuses, setSubmissionStatuses] = useState<Record<string, SubmissionStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Get student's class
      const studentRes = await api.get('/students/me')
      const student = studentRes.data.student || studentRes.data
      const classId = student?.classId

      if (!classId) {
        setAssignments([])
        setLoading(false)
        return
      }

      const assignRes = await api.get(`/assignments/class/${classId}`)
      const assignList: Assignment[] = assignRes.data.assignments || []
      setAssignments(assignList)

      // Load submission statuses for each assignment
      const statuses: Record<string, SubmissionStatus> = {}
      for (const a of assignList) {
        try {
          const subRes = await api.get(`/assignments/${a._id}/submissions/${student._id || student.id}`)
          const sub = subRes.data
          statuses[a._id] = { assignmentId: a._id, status: sub.status, marks: sub.marks }
        } catch {
          statuses[a._id] = { assignmentId: a._id, status: 'not_submitted' }
        }
      }
      setSubmissionStatuses(statuses)
    } catch {
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      not_submitted: 'bg-secondary-100 text-secondary-700',
      submitted: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
      graded: 'bg-blue-100 text-blue-700',
    }
    return map[status] || 'bg-secondary-100 text-secondary-700'
  }

  const isPastDue = (dueDate: string) => new Date(dueDate) < new Date()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">My Assignments</h2>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No published assignments.</div>
      ) : (
        <div className="space-y-3">
          {assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((a) => {
            const sub = submissionStatuses[a._id]
            const pastDue = isPastDue(a.dueDate)

            return (
              <div key={a._id} className="rounded-xl bg-white p-4 shadow-lg flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-secondary-900 truncate">{a.title}</h3>
                    {sub && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(sub.status)}`}>
                        {sub.status === 'graded' ? `${sub.marks}/${a.maxMarks}` : sub.status.replace('_', ' ')}
                      </span>
                    )}
                    {pastDue && sub?.status === 'not_submitted' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Past Due</span>
                    )}
                  </div>
                  <p className="text-sm text-secondary-500 mt-0.5">
                    {a.subjectId?.name} | Due: {new Date(a.dueDate).toLocaleDateString()}
                    {a.subjectId?.code ? ` (${a.subjectId.code})` : ''}
                  </p>
                </div>
                <Link
                  to={`/assignments/${a._id}/submit`}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 ml-4 shrink-0"
                >
                  {sub?.status === 'not_submitted' ? 'Submit' : sub?.status === 'graded' ? 'View' : 'Resubmit'}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
