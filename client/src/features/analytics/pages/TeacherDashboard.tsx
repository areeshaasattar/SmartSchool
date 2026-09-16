import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import AIInsightCard from '../../ai/insights/components/AIInsightCard'
import { useListInsightsQuery } from '../../ai/insights/api/insightsApi'

interface TimetableSlot {
  _id: string
  startTime: string
  endTime: string
  classId: { grade: string; section: string }
  subjectId: { name: string }
}

interface OverviewData {
  todayTimetable: TimetableSlot[]
  pendingGrading: number
  attendanceStatus: { marked: number; total: number; classes: string[] }
  recentMessages: number
}

export default function TeacherDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: insightsData } = useListInsightsQuery({ limit: 5 })

  useEffect(() => {
    api.get('/analytics/teacher/overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
  if (!data) return <div className="text-center text-secondary-400 py-8">Failed to load dashboard</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Teacher Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Timetable */}
        <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide">Today's Schedule</h3>
            <span className="text-2xl">📅</span>
          </div>
          {data.todayTimetable.length === 0 ? (
            <p className="text-sm text-secondary-400">No classes scheduled today</p>
          ) : (
            <div className="space-y-2">
              {data.todayTimetable.map((slot) => (
                <div key={slot._id} className="flex items-center gap-3 rounded-lg bg-secondary-50 p-2">
                  <span className="text-xs font-mono text-secondary-500 w-20">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <span className="text-sm font-medium text-secondary-900">
                    {slot.subjectId?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-secondary-400">
                    {slot.classId?.grade}-{slot.classId?.section}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Grading */}
        <Link to="/assignments" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Pending Grading</p>
              <p className={`text-3xl font-bold ${data.pendingGrading > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {data.pendingGrading}
              </p>
            </div>
            <span className="text-3xl">📝</span>
          </div>
        </Link>

        {/* Attendance Status */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-secondary-500">Attendance Status</p>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-lg font-bold text-secondary-900">
            {data.attendanceStatus.marked}/{data.attendanceStatus.total} classes marked
          </p>
          {data.attendanceStatus.marked < data.attendanceStatus.total && (
            <Link to="/attendance/mark" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
              Mark Attendance →
            </Link>
          )}
        </div>

        {/* Recent Messages */}
        <Link to="/messages" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Recent Messages</p>
              <p className="text-3xl font-bold text-blue-600">{data.recentMessages}</p>
              <p className="text-xs text-secondary-400">last 7 days</p>
            </div>
            <span className="text-3xl">✉️</span>
          </div>
        </Link>
      </div>

      {/* AI Insights — scoped server-side to this teacher's own classes */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AIInsightCard type="academic" insights={(insightsData?.insights ?? []).filter((i) => i.type === 'academic')} />
        <AIInsightCard type="attendance" insights={(insightsData?.insights ?? []).filter((i) => i.type === 'attendance')} />
      </div>
    </div>
  )
}
