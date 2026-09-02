import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface Assignment {
  _id: string
  title: string
  description: string
  classId: { _id: string; grade: string; section: string }
  subjectId: { name: string; code: string }
  dueDate: string
  maxMarks: number
  status: 'draft' | 'published' | 'closed'
  createdAt: string
}

interface ClassOption { _id: string; grade: string; section: string }

export default function TeacherAssignmentListPage() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/classes?limit=100').then((res) => {
      setClasses(res.data.classes || res.data)
    }).catch(() => { /* silent */ })
  }, [])

  const loadAssignments = useCallback(async () => {
    if (!selectedClassId) { setAssignments([]); setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get(`/assignments/class/${selectedClassId}`)
      setAssignments(res.data.assignments || [])
    } catch {
      setError('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  const handlePublish = async (id: string) => {
    try {
      await api.post(`/assignments/${id}/publish`)
      setSuccess('Assignment published')
      loadAssignments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return
    try {
      await api.delete(`/assignments/${id}`)
      setSuccess('Assignment deleted')
      loadAssignments()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-700',
      published: 'bg-green-100 text-green-700',
      closed: 'bg-secondary-100 text-secondary-700',
    }
    return map[status] || 'bg-secondary-100 text-secondary-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Assignments</h2>
        {selectedClassId && (
          <Link
            to={`/assignments/new?classId=${selectedClassId}`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Assignment
          </Link>
        )}
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">Select Class *</label>
        <select
          value={selectedClassId}
          onChange={(e) => { setSelectedClassId(e.target.value); setAssignments([]) }}
          className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Choose a class</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">
          {selectedClassId ? 'No assignments found. Create one!' : 'Select a class to view assignments.'}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-secondary-700">Title</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Subject</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Due Date</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Max Marks</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {assignments.map((a) => (
                <tr key={a._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-medium text-secondary-900">{a.title}</td>
                  <td className="px-4 py-3 text-secondary-600">{a.subjectId?.name}</td>
                  <td className="px-4 py-3 text-secondary-600">
                    {new Date(a.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{a.maxMarks}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {a.status === 'draft' && (
                        <>
                          <button onClick={() => navigate(`/assignments/${a._id}/edit`)}
                            className="text-xs text-primary-700 hover:underline">Edit</button>
                          <button onClick={() => handlePublish(a._id)}
                            className="text-xs text-green-700 hover:underline">Publish</button>
                          <button onClick={() => handleDelete(a._id)}
                            className="text-xs text-red-600 hover:underline">Delete</button>
                        </>
                      )}
                      {a.status === 'published' && (
                        <Link to={`/assignments/${a._id}/submissions`}
                          className="text-xs text-primary-700 hover:underline">View Submissions</Link>
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
