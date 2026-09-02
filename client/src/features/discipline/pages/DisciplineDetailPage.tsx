import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface DisciplineRecord {
  _id: string
  studentId: { _id: string; profile: { firstName: string; lastName: string } }
  incidentDate: string
  category: string
  description: string
  severity: string
  actionTaken?: string
  followUp: Array<{ date: string; note: string; recordedBy: { profile?: { firstName: string; lastName: string } } }>
  status: string
}

export default function DisciplineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const [record, setRecord] = useState<DisciplineRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/discipline/${id}`)
      .then((res) => setRecord(res.data))
      .catch(() => setError('Failed to load discipline record'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddFollowUp = async () => {
    if (!id || !newNote.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/discipline/${id}/follow-up`, { note: newNote })
      setRecord(res.data)
      setNewNote('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add follow-up'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!id || !record) return
    setSubmitting(true)
    try {
      const newStatus = record.status === 'open' ? 'resolved' : 'open'
      const res = await api.patch(`/discipline/${id}`, { status: newStatus })
      setRecord(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-100 text-yellow-700'
      case 'moderate': return 'bg-orange-100 text-orange-700'
      case 'major': return 'bg-red-100 text-red-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (!record) return <div className="text-center text-secondary-500 py-8">Record not found</div>

  const canEdit = user?.roles?.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/discipline')} className="text-sm text-primary-600 hover:underline mb-4">
        ← Back to Discipline Records
      </button>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold text-secondary-900">
            {record.studentId?.profile?.firstName} {record.studentId?.profile?.lastName}
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor(record.severity)}`}>
            {record.severity}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            record.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          }`}>
            {record.status}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-secondary-500">Category</span>
            <p className="text-secondary-900 capitalize">{record.category.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-secondary-500">Incident Date</span>
            <p className="text-secondary-900">{new Date(record.incidentDate).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-secondary-500">Description</span>
            <p className="text-secondary-900">{record.description}</p>
          </div>
          {record.actionTaken && (
            <div>
              <span className="text-sm font-medium text-secondary-500">Action Taken</span>
              <p className="text-secondary-900">{record.actionTaken}</p>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="mt-6 pt-4 border-t">
            <button
              onClick={handleToggleStatus}
              disabled={submitting}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                record.status === 'open'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-secondary-200 text-secondary-700 hover:bg-secondary-300'
              } disabled:opacity-50`}
            >
              {submitting ? 'Updating...' : record.status === 'open' ? 'Mark Resolved' : 'Reopen'}
            </button>
          </div>
        )}
      </div>

      {/* Follow-ups */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-secondary-900 mb-4">Follow-up Notes</h2>

        {record.followUp.length === 0 ? (
          <p className="text-sm text-secondary-400 mb-4">No follow-up notes yet</p>
        ) : (
          <div className="space-y-3 mb-4">
            {record.followUp.map((fu, idx) => (
              <div key={idx} className="rounded-lg bg-secondary-50 p-3">
                <p className="text-sm text-secondary-700">{fu.note}</p>
                <p className="text-xs text-secondary-400 mt-1">
                  {fu.recordedBy?.profile?.firstName} {fu.recordedBy?.profile?.lastName} • {new Date(fu.date).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a follow-up note..."
              className="flex-1 rounded-lg border border-secondary-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              onClick={handleAddFollowUp}
              disabled={submitting || !newNote.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
