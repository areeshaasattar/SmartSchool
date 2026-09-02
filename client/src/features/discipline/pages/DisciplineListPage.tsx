import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface DisciplineRecord {
  _id: string
  studentId: { _id: string; profile: { firstName: string; lastName: string } }
  incidentDate: string
  category: string
  severity: string
  description: string
  status: string
  createdAt: string
}

export default function DisciplineListPage() {
  const [records, setRecords] = useState<DisciplineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadRecords()
  }, [statusFilter, page])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/discipline?${params}`)
      setRecords(res.data.records)
      setTotalPages(res.data.pagination.pages)
    } catch {
      setError('Failed to load discipline records')
    } finally {
      setLoading(false)
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Discipline Records</h1>
        <Link
          to="/discipline/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Report
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {/* Status Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'open', 'resolved'].map((s) => (
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
      ) : records.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No discipline records found</div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Link
              key={record._id}
              to={`/discipline/${record._id}`}
              className="block rounded-xl bg-white p-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-secondary-900">
                      {record.studentId?.profile?.firstName} {record.studentId?.profile?.lastName}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor(record.severity)}`}>
                      {record.severity}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      record.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-500">
                    {record.category.replace('_', ' ')} • {new Date(record.incidentDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-secondary-600 mt-1 line-clamp-2">{record.description}</p>
                </div>
              </div>
            </Link>
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
