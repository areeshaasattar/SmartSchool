import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface AttendanceRecord {
  _id: string
  studentId: { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
  date: string
  status: string
  remarks?: string
  markedBy?: { profile: { firstName: string; lastName: string } }
}

interface ClassInfo {
  _id: string
  grade: string
  section: string
}

export default function ClassAttendanceViewPage() {
  const { classId } = useParams<{ classId: string }>()
  const [cls, setCls] = useState<ClassInfo | null>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadAttendance = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const [attRes, classRes] = await Promise.all([
        api.get(`/attendance/class/${classId}?${params}`),
        api.get(`/classes/${classId}`),
      ])

      setRecords(attRes.data.records || [])
      setTotalPages(attRes.data.totalPages || 1)
      setCls(classRes.data)
    } catch {
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [classId, page, startDate, endDate])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

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

  // Group records by date for summary
  const dateSummary: Record<string, { present: number; absent: number; late: number; excused: number; half_day: number; total: number }> = {}
  records.forEach((r) => {
    const dateKey = new Date(r.date).toLocaleDateString()
    if (!dateSummary[dateKey]) {
      dateSummary[dateKey] = { present: 0, absent: 0, late: 0, excused: 0, half_day: 0, total: 0 }
    }
    dateSummary[dateKey][r.status as keyof typeof dateSummary[string]]++
    dateSummary[dateKey].total++
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">
            Attendance — {cls?.grade} {cls?.section}
          </h2>
          <p className="text-sm text-secondary-500">Class attendance over time</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/attendance/mark`}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Mark Attendance
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
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

      {/* Date summary cards */}
      {Object.keys(dateSummary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(dateSummary).map(([date, summary]) => (
            <div key={date} className="rounded-lg border border-secondary-200 bg-white p-3">
              <p className="text-xs font-medium text-secondary-500">{date}</p>
              <div className="mt-1 flex gap-1 text-xs">
                <span className="text-green-600">✓{summary.present}</span>
                <span className="text-red-600">✗{summary.absent}</span>
                <span className="text-yellow-600">⏰{summary.late}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Records table */}
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
                <th className="px-4 py-3 font-medium text-secondary-700">Student</th>
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
                  <td className="px-4 py-3 font-medium text-secondary-900">
                    {r.studentId?.profile.firstName} {r.studentId?.profile.lastName}
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
