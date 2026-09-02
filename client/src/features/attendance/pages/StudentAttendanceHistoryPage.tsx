import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface AttendanceRecord {
  _id: string
  date: string
  status: string
  remarks?: string
  classId?: { grade: string; section: string }
  markedBy?: { profile: { firstName: string; lastName: string } }
}

interface Summary {
  summary: { present: number; absent: number; late: number; excused: number; half_day: number }
  totalRecords: number
  percentage: number
}

export default function StudentAttendanceHistoryPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const user = useSelector((state: RootState) => state.auth.user)

  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const targetStudentId = studentId || user?.id

  const loadData = useCallback(async () => {
    if (!targetStudentId) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const [histRes, sumRes] = await Promise.all([
        api.get(`/attendance/student/${targetStudentId}?${params}`),
        api.get(`/attendance/summary?studentId=${targetStudentId}${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`),
      ])

      setRecords(histRes.data.records || [])
      setTotalPages(histRes.data.totalPages || 1)
      setSummary(sumRes.data)
    } catch {
      setError('Failed to load attendance history')
    } finally {
      setLoading(false)
    }
  }, [targetStudentId, page, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      present: 'bg-green-100 text-green-700',
      absent: 'bg-red-100 text-red-700',
      late: 'bg-yellow-100 text-yellow-700',
      excused: 'bg-blue-100 text-blue-700',
      half_day: 'bg-purple-100 text-purple-700',
    }
    return map[status] || 'bg-secondary-100 text-secondary-700'
  }

  // Simple bar chart data
  const getBarWidth = (count: number) => {
    if (!summary || summary.totalRecords === 0) return '0%'
    return `${Math.round((count / summary.totalRecords) * 100)}%`
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Attendance History</h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Summary card */}
      {summary && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Attendance Overview</h3>
            <div className={`text-3xl font-bold ${summary.percentage >= 75 ? 'text-green-600' : summary.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {summary.percentage}%
            </div>
          </div>

          {/* Bar chart */}
          <div className="space-y-2">
            {(['present', 'absent', 'late', 'excused', 'half_day'] as const).map((status) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium capitalize text-secondary-600">{status.replace('_', ' ')}</span>
                <div className="flex-1 h-4 rounded-full bg-secondary-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      status === 'present' ? 'bg-green-500' :
                      status === 'absent' ? 'bg-red-500' :
                      status === 'late' ? 'bg-yellow-500' :
                      status === 'excused' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}
                    style={{ width: getBarWidth(summary.summary[status]) }}
                  />
                </div>
                <span className="w-12 text-xs text-secondary-500 text-right">{summary.summary[status]}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-secondary-400">
            Total records: {summary.totalRecords} | Last 30 days rolling percentage shown above
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
            className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
            className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Records log */}
      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No attendance records found.</div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-secondary-700">Date</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Class</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Remarks</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Marked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {records.map((r) => (
                <tr key={r._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 text-secondary-600">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {r.classId?.grade} {r.classId?.section}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadge(r.status)}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-500">{r.remarks || '—'}</td>
                  <td className="px-4 py-3 text-secondary-500">
                    {r.markedBy?.profile.firstName} {r.markedBy?.profile.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-secondary-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
