import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../../services/api'

interface Assignment {
  _id: string
  title: string
  subjectId: { name: string }
  classId: { grade: string; section: string }
  dueDate: string
  maxMarks: number
}

interface SubmissionInfo {
  status: string
  marks?: number
  feedback?: string
  gradedAt?: string
}

export default function ParentChildAssignmentsPage() {
  const { childId } = useParams<{ childId: string }>()
  const [assignments, setAssignments] = useState<(Assignment & { submission?: SubmissionInfo })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!childId) return
    setLoading(true)
    try {
      // Get student's class
      const studentRes = await api.get(`/students/${childId}`)
      const student = studentRes.data.student || studentRes.data
      const classId = student?.classId

      if (!classId) {
        setAssignments([])
        setLoading(false)
        return
      }

      const assignRes = await api.get(`/assignments/class/${classId}`)
      const assignList: Assignment[] = assignRes.data.assignments || []

      // Load submission for each assignment
      const withSubmissions = await Promise.all(
        assignList.map(async (a) => {
          try {
            const subRes = await api.get(`/assignments/${a._id}/submissions/${childId}`)
            return { ...a, submission: subRes.data as SubmissionInfo }
          } catch {
            return { ...a, submission: undefined }
          }
        })
      )

      setAssignments(withSubmissions)
    } catch {
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => { loadData() }, [loadData])

  const getStatusBadge = (sub?: SubmissionInfo) => {
    if (!sub || sub.status === 'not_submitted') {
      return <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-700">Not Submitted</span>
    }
    if (sub.status === 'graded') {
      return (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          Graded: {sub.marks}
        </span>
      )
    }
    const map: Record<string, string> = {
      submitted: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
    }
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[sub.status] || 'bg-secondary-100 text-secondary-700'}`}>
        {sub.status}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Child's Assignments</h2>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No assignments found.</div>
      ) : (
        <div className="space-y-3">
          {assignments
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
            .map((a) => (
              <div key={a._id} className="rounded-xl bg-white p-4 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-secondary-900">{a.title}</h3>
                    <p className="text-sm text-secondary-500">
                      {a.subjectId?.name} | Due: {new Date(a.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(a.submission)}
                </div>
                {a.submission?.feedback && (
                  <p className="mt-2 text-sm text-secondary-600 italic">
                    Feedback: {a.submission.feedback}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
