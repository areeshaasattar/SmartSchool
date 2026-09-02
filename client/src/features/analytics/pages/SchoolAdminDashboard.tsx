import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface OverviewData {
  studentCount: number
  teacherCount: number
  attendanceToday: { percentage: number; present: number; total: number }
  feeCollectionRate: number
  totalOutstanding: number
  pendingApprovals: number
}

export default function SchoolAdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/school-admin/overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
  if (!data) return <div className="text-center text-secondary-400 py-8">Failed to load dashboard</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">School Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Students */}
        <Link to="/students" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Students</p>
              <p className="text-3xl font-bold text-secondary-900">{data.studentCount}</p>
            </div>
            <span className="text-3xl">🎓</span>
          </div>
        </Link>

        {/* Teachers */}
        <Link to="/teachers" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Teachers</p>
              <p className="text-3xl font-bold text-secondary-900">{data.teacherCount}</p>
            </div>
            <span className="text-3xl">👩‍🏫</span>
          </div>
        </Link>

        {/* Today's Attendance */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-secondary-500">Today's Attendance</p>
            <span className="text-3xl">📊</span>
          </div>
          <p className={`text-3xl font-bold ${data.attendanceToday.percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
            {data.attendanceToday.percentage}%
          </p>
          <p className="text-xs text-secondary-400 mt-1">
            {data.attendanceToday.present}/{data.attendanceToday.total} present
          </p>
        </div>

        {/* Fee Collection Rate */}
        <Link to="/fees/collection" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Fee Collection Rate</p>
              <p className="text-3xl font-bold text-blue-600">{data.feeCollectionRate}%</p>
              <p className="text-xs text-secondary-400 mt-1">
                ${data.totalOutstanding.toLocaleString()} outstanding
              </p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </Link>

        {/* Pending Approvals */}
        <Link to="/leave" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Pending Leave Requests</p>
              <p className="text-3xl font-bold text-yellow-600">{data.pendingApprovals}</p>
            </div>
            <span className="text-3xl">📅</span>
          </div>
        </Link>

        {/* Quick Links */}
        <div className="rounded-xl bg-primary-50 p-5 shadow-lg">
          <p className="text-sm font-bold text-primary-700 mb-3">Quick Actions</p>
          <div className="space-y-2">
            <Link to="/students/new" className="block text-sm text-primary-600 hover:underline">+ Add Student</Link>
            <Link to="/teachers/new" className="block text-sm text-primary-600 hover:underline">+ Add Teacher</Link>
            <Link to="/fees/invoices/generate" className="block text-sm text-primary-600 hover:underline">Generate Invoices</Link>
            <Link to="/leave" className="block text-sm text-primary-600 hover:underline">Review Leave Requests</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
