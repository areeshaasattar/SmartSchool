import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface LeaveRequest {
  _id: string
  requesterType: 'student' | 'teacher'
  requesterId: { _id: string; profile?: { firstName: string; lastName: string }; employeeNo?: string }
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewComment?: string
  createdAt: string
}

export default function LeaveListPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadRequests()
  }, [statusFilter, page])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/leave?${params}`)
      setRequests(res.data.requests)
      setTotalPages(res.data.pagination.pages)
    } catch {
      setError('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'approved': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-secondary-100 text-secondary-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  const canReview = user?.roles?.some(r => ['super_admin', 'school_admin', 'principal', 'hr'].includes(r))

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Leave Requests</h1>
        <Link
          to="/leave/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Request
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {/* Status Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'pending', 'approved', 'rejected', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No leave requests found</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req._id} className="rounded-xl bg-white p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-secondary-900">
                      {req.requesterType === 'student' ? 'Student' : 'Teacher'} Leave
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-600">
                    {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{req.reason}</p>
                  {req.reviewComment && (
                    <p className="text-sm text-secondary-500 mt-1 italic">Review: {req.reviewComment}</p>
                  )}
                </div>
                {canReview && req.status === 'pending' && (
                  <Link
                    to={`/leave/${req._id}/review`}
                    className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                  >
                    Review
                  </Link>
                )}
              </div>
              <p className="text-xs text-secondary-400 mt-2">
                Submitted {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-1.5 text-sm text-secondary-600 hover:bg-secondary-100 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-lg px-3 py-1.5 text-sm text-secondary-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-secondary-600 hover:bg-secondary-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
