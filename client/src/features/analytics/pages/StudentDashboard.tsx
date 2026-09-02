import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface TimetableSlot {
  _id: string
  startTime: string
  endTime: string
  subjectId: { name: string }
  teacherId: { profile: { firstName: string; lastName: string } }
}

interface Exam {
  _id: string
  name: string
  term: string
}

interface Grade {
  _id: string
  percentage: number
  overallGrade: string
  rank?: number
  examId: { name: string; term: string }
}

interface OverviewData {
  student: { name: string; admissionNo: string } | null
  todayTimetable: TimetableSlot[]
  upcomingExams: Exam[]
  pendingAssignments: number
  attendance: number
  recentGrades: Grade[]
}

export default function StudentDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/student/overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
  if (!data) return <div className="text-center text-secondary-400 py-8">Failed to load dashboard</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">
          Welcome{data.student ? `, ${data.student.name}` : ''}
        </h1>
        {data.student && (
          <span className="text-sm text-secondary-400">#{data.student.admissionNo}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Attendance */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-secondary-500">Attendance</p>
            <span className="text-2xl">📊</span>
          </div>
          <p className={`text-3xl font-bold ${data.attendance >= 75 ? 'text-green-600' : 'text-red-600'}`}>
            {data.attendance}%
          </p>
          <div className="h-2 bg-secondary-100 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${data.attendance >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${data.attendance}%` }}
            />
          </div>
        </div>

        {/* Pending Assignments */}
        <Link to="/my-assignments" className="rounded-xl bg-white p-5 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-500">Pending Homework</p>
              <p className={`text-3xl font-bold ${data.pendingAssignments > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {data.pendingAssignments}
              </p>
            </div>
            <span className="text-3xl">📝</span>
          </div>
        </Link>

        {/* Upcoming Exams */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide">Upcoming Exams</h3>
            <span className="text-2xl">📋</span>
          </div>
          {data.upcomingExams.length === 0 ? (
            <p className="text-sm text-secondary-400">No upcoming exams</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingExams.slice(0, 3).map((exam) => (
                <div key={exam._id} className="flex items-center justify-between text-sm">
                  <span className="text-secondary-700 truncate">{exam.name}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{exam.term}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Timetable */}
        <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide">Today's Schedule</h3>
            <span className="text-2xl">📅</span>
          </div>
          {data.todayTimetable.length === 0 ? (
            <p className="text-sm text-secondary-400">No classes today</p>
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
                    {slot.teacherId?.profile?.firstName} {slot.teacherId?.profile?.lastName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Grades */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Recent Grades</h3>
          {data.recentGrades.length === 0 ? (
            <p className="text-sm text-secondary-400">No grades published yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentGrades.map((grade) => (
                <div key={grade._id} className="flex items-center justify-between text-sm">
                  <span className="text-secondary-700 truncate">{grade.examId?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-secondary-900">{grade.overallGrade}</span>
                    {grade.rank && <span className="text-xs text-secondary-500">#{grade.rank}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
