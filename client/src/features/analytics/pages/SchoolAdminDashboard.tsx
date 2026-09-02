import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import { CalendarDays, GraduationCap, Landmark, Users } from 'lucide-react'
import Card from '../../../app/components/ui/Card'
import StatCard from '../../../app/components/ui/StatCard'

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
      <div><p className="text-sm text-text-muted">Overview</p><h1 className="text-3xl font-bold text-text-heading">School dashboard</h1></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/students"><StatCard label="Students" value={data.studentCount} icon={<GraduationCap />} tone="purple" /></Link>
        <Link to="/teachers"><StatCard label="Teachers" value={data.teacherCount} icon={<Users />} tone="blue" /></Link>

        {/* Today's Attendance */}
        <StatCard label="Today's attendance" value={`${data.attendanceToday.percentage}%`} icon={<CalendarDays />} tone="yellow" trend={`${data.attendanceToday.present}/${data.attendanceToday.total} present`} />

        {/* Fee Collection Rate */}
        <Link to="/fees/collection"><StatCard label="Fee collection" value={`${data.feeCollectionRate}%`} icon={<Landmark />} tone="blue" trend={`$${data.totalOutstanding.toLocaleString()} outstanding`} /></Link>

        {/* Pending Approvals */}
        <Link to="/leave"><StatCard label="Pending leave requests" value={data.pendingApprovals} icon={<CalendarDays />} tone="yellow" /></Link>

        {/* Quick Links */}
        <Card title="Quick actions" className="bg-surface">
          <div className="space-y-2">
            <Link to="/students/new" className="block text-sm text-primary-600 hover:underline">+ Add Student</Link>
            <Link to="/teachers/new" className="block text-sm text-primary-600 hover:underline">+ Add Teacher</Link>
            <Link to="/fees/invoices/generate" className="block text-sm text-primary-600 hover:underline">Generate Invoices</Link>
            <Link to="/leave" className="block text-sm text-primary-600 hover:underline">Review Leave Requests</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
