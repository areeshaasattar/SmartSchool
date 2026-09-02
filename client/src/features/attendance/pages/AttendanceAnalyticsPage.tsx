import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface Summary {
  summary: { present: number; absent: number; late: number; excused: number; half_day: number }
  totalRecords: number
  percentage: number
}

interface ClassOption {
  _id: string
  grade: string
  section: string
}

export default function AttendanceAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load classes
  useEffect(() => {
    api.get('/classes?limit=100').then((res) => {
      setClasses(res.data.classes || res.data)
    }).catch(() => { /* silent */ })
  }, [])

  // Load summary
  useEffect(() => {
    setLoading(true)
    setError('')
    const params = selectedClassId ? `?classId=${selectedClassId}` : ''
    api.get(`/attendance/summary${params}`)
      .then((res) => setSummary(res.data))
      .catch(() => setError('Failed to load attendance summary'))
      .finally(() => setLoading(false))
  }, [selectedClassId])

  const getBarWidth = (count: number) => {
    if (!summary || summary.totalRecords === 0) return '0%'
    return `${Math.round((count / summary.totalRecords) * 100)}%`
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      present: 'bg-green-500',
      absent: 'bg-red-500',
      late: 'bg-yellow-500',
      excused: 'bg-blue-500',
      half_day: 'bg-purple-500',
    }
    return map[status] || 'bg-secondary-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Attendance Analytics</h2>
        <Link
          to="/attendance/mark"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Mark Attendance
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Class filter */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">Filter by Class</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Classes (School-wide)</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.grade} - {c.section}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading analytics...</div>
      ) : summary ? (
        <>
          {/* Main stat card */}
          <div className="rounded-xl bg-white p-8 shadow-lg text-center">
            <p className="text-sm font-medium text-secondary-500 uppercase tracking-wide">
              {selectedClassId ? 'Class' : 'School-wide'} Attendance
            </p>
            <div className={`mt-2 text-6xl font-bold ${
              summary.percentage >= 90 ? 'text-green-600' :
              summary.percentage >= 75 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {summary.percentage}%
            </div>
            <p className="mt-2 text-sm text-secondary-400">
              Based on {summary.totalRecords} attendance records
            </p>
          </div>

          {/* Breakdown chart */}
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {(['present', 'absent', 'late', 'excused', 'half_day'] as const).map((status) => (
                <div key={status} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium capitalize text-secondary-700">
                    {status.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-6 rounded-full bg-secondary-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getStatusColor(status)} transition-all duration-500`}
                      style={{ width: getBarWidth(summary.summary[status]) }}
                    />
                  </div>
                  <span className="w-16 text-sm font-medium text-secondary-600 text-right">
                    {summary.summary[status]}
                  </span>
                  <span className="w-12 text-xs text-secondary-400 text-right">
                    {summary.totalRecords > 0 ? Math.round((summary.summary[status] / summary.totalRecords) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/attendance/mark"
              className="rounded-xl border border-secondary-200 bg-white p-4 text-center hover:bg-secondary-50 transition-colors"
            >
              <div className="text-2xl mb-2">📝</div>
              <p className="font-medium text-secondary-900">Mark Attendance</p>
              <p className="text-xs text-secondary-500">Record daily attendance</p>
            </Link>
            <Link
              to="/classes"
              className="rounded-xl border border-secondary-200 bg-white p-4 text-center hover:bg-secondary-50 transition-colors"
            >
              <div className="text-2xl mb-2">🏫</div>
              <p className="font-medium text-secondary-900">View by Class</p>
              <p className="text-xs text-secondary-500">See class-specific attendance</p>
            </Link>
            <Link
              to="/students"
              className="rounded-xl border border-secondary-200 bg-white p-4 text-center hover:bg-secondary-50 transition-colors"
            >
              <div className="text-2xl mb-2">👤</div>
              <p className="font-medium text-secondary-900">Student History</p>
              <p className="text-xs text-secondary-500">Individual student records</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}
