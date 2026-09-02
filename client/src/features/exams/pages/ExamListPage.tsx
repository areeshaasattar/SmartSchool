import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import RequireRole from '../../../app/components/RequireRole'

interface Exam {
  _id: string
  name: string
  term: string
  classIds: { _id: string; grade: string; section: string }[]
  schedule: { subjectId: { name: string }; maxMarks: number }[]
  status: string
  createdAt: string
}

export default function ExamListPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadExams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/exams')
      setExams(res.data)
    } catch {
      setError('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadExams() }, [loadExams])

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this exam? All marks will be finalized and grades computed.')) return
    try {
      await api.post(`/exams/${id}/publish`)
      setSuccess('Exam published successfully')
      loadExams()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam?')) return
    try {
      await api.delete(`/exams/${id}`)
      setSuccess('Exam deleted')
      loadExams()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700',
      scheduled: 'bg-blue-100 text-blue-700',
      ongoing: 'bg-orange-100 text-orange-700',
      completed: 'bg-secondary-100 text-secondary-700',
      published: 'bg-green-100 text-green-700',
    }
    return map[status] || 'bg-secondary-100 text-secondary-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Exams</h2>
        <RequireRole roles={['super_admin', 'school_admin', 'principal']}>
          <Link to="/exams/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + New Exam
          </Link>
        </RequireRole>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : exams.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No exams found.</div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Term</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Classes</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Subjects</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {exams.map((exam) => (
                <tr key={exam._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-medium text-secondary-900">{exam.name}</td>
                  <td className="px-4 py-3 text-secondary-600">{exam.term}</td>
                  <td className="px-4 py-3 text-secondary-600">
                    {exam.classIds.map((c) => `${c.grade}-${c.section}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{exam.schedule.length}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(exam.status)}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/audit/history?entity=exam&entityId=${exam._id}`} className="text-xs text-secondary-600 hover:underline">History</Link>
                      {exam.status === 'draft' && (
                        <>
                          <Link to={`/exams/${exam._id}/marks`} className="text-xs text-primary-700 hover:underline">Enter Marks</Link>
                          <button onClick={() => handlePublish(exam._id)} className="text-xs text-green-700 hover:underline">Publish</button>
                          <button onClick={() => handleDelete(exam._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </>
                      )}
                      {(exam.status === 'scheduled' || exam.status === 'ongoing' || exam.status === 'completed') && (
                        <Link to={`/exams/${exam._id}/marks`} className="text-xs text-primary-700 hover:underline">Enter Marks</Link>
                      )}
                      {exam.status === 'published' && (
                        <Link to={`/exams/${exam._id}/results`} className="text-xs text-primary-700 hover:underline">View Results</Link>
                      )}
                    </div>
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
