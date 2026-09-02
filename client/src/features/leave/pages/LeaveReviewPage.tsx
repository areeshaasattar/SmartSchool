import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface LeaveRequest {
  _id: string
  requesterType: 'student' | 'teacher'
  startDate: string
  endDate: string
  reason: string
  status: string
  createdAt: string
}

export default function LeaveReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [leave, setLeave] = useState<LeaveRequest | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/leave/${id}`)
      .then((res) => setLeave(res.data))
      .catch(() => setError('Failed to load leave request'))
      .finally(() => setLoading(false))
  }, [id])

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!id) return
    setSubmitting(true)
    setError('')
    try {
      await api.post(`/leave/${id}/review`, { status, reviewComment })
      navigate('/leave')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to review leave request'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>

  if (!leave) return <div className="text-center text-secondary-500 py-8">Leave request not found</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Review Leave Request</h1>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-secondary-500">Type</span>
            <p className="text-secondary-900">{leave.requesterType === 'student' ? 'Student' : 'Teacher'} Leave</p>
          </div>
          <div>
            <span className="text-sm font-medium text-secondary-500">Date Range</span>
            <p className="text-secondary-900">
              {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-secondary-500">Reason</span>
            <p className="text-secondary-900">{leave.reason}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-secondary-500">Submitted</span>
            <p className="text-secondary-900">{new Date(leave.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Review Form */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <label className="block text-sm font-medium text-secondary-700 mb-2">Review Comment (optional)</label>
        <textarea
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-secondary-300 px-4 py-2 mb-4 focus:border-primary-500 focus:outline-none"
          placeholder="Add a comment for the requester..."
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/leave')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleReview('rejected')}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={() => handleReview('approved')}
            disabled={submitting}
            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}
