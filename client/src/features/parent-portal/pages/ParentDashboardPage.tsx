import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import { selectChild } from '../../../store'
import api from '../../../services/api'

interface Child {
  id: string
  admissionNo: string
  profile: { firstName: string; lastName: string; gender: string }
  status: string
  classId: string
}

interface DashboardData {
  student: { id: string; admissionNo: string; profile: { firstName: string; lastName: string }; classId: string }
  attendance: { percentage: number }
  upcomingExams: { _id: string; name: string; term: string; status: string }[]
  recentResults: { _id: string; examName: string; percentage: number; overallGrade: string; rank?: number }[]
  recentAssignments: { _id: string; title: string; subject: { name: string }; dueDate: string; submissionStatus: string; marks?: number }[]
  fees: { outstanding: number; invoiceCount: number; overdueCount: number } | null
  messages: { unread: number }
  leave: { pending: number }
  announcements: { count: number }
}

export default function ParentDashboardPage() {
  const dispatch = useDispatch()
  const selectedChildId = useSelector((state: RootState) => state.parentPortal.selectedChildId)
  const [children, setChildren] = useState<Child[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load children list
  useEffect(() => {
    api.get('/parent-portal/children')
      .then((res) => {
        const list = res.data.children || []
        setChildren(list)
        // Auto-select first child if none selected
        if (!selectedChildId && list.length > 0) {
          dispatch(selectChild(list[0].id))
        }
      })
      .catch(() => setError('Failed to load children'))
  }, [selectedChildId, dispatch])

  // Load dashboard when child is selected
  const loadDashboard = useCallback(async () => {
    if (!selectedChildId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get(`/parent-portal/dashboard?studentId=${selectedChildId}`)
      setDashboard(res.data)
    } catch {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const handleChildSwitch = (childId: string) => {
    dispatch(selectChild(childId))
    setDashboard(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      {/* Children selector */}
      {children.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary-700">Select Child:</span>
          <div className="flex gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSwitch(child.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedChildId === child.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                {child.profile.firstName} {child.profile.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      {children.length === 1 && (
        <h2 className="text-2xl font-bold text-secondary-900">
          Welcome, {children[0]?.profile.firstName}'s Parent
        </h2>
      )}

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
      ) : dashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Attendance Card */}
          <div className="rounded-xl bg-white p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide">Attendance</h3>
              <span className={`text-2xl font-bold ${dashboard.attendance.percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                {dashboard.attendance.percentage}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-secondary-100 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${dashboard.attendance.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${dashboard.attendance.percentage}%` }}
              />
            </div>
            <Link to={`/attendance/student/${dashboard.student.id}`}
              className="text-xs text-primary-700 hover:underline">View Full History →</Link>
          </div>

          {/* Upcoming Exams Card */}
          <div className="rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Upcoming Exams</h3>
            {dashboard.upcomingExams.length === 0 ? (
              <p className="text-sm text-secondary-400">No upcoming exams</p>
            ) : (
              <div className="space-y-2">
                {dashboard.upcomingExams.slice(0, 3).map((exam) => (
                  <div key={exam._id} className="flex items-center justify-between text-sm">
                    <span className="text-secondary-700 truncate">{exam.name}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{exam.term}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Results Card */}
          <div className="rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Recent Results</h3>
            {dashboard.recentResults.length === 0 ? (
              <p className="text-sm text-secondary-400">No results published yet</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentResults.map((r) => (
                  <div key={r._id} className="flex items-center justify-between text-sm">
                    <span className="text-secondary-700 truncate">{r.examName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-secondary-900">{r.overallGrade}</span>
                      {r.rank && <span className="text-xs text-secondary-500">#{r.rank}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Homework/Assignments Card */}
          <div className="rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Recent Homework</h3>
            {dashboard.recentAssignments.length === 0 ? (
              <p className="text-sm text-secondary-400">No assignments</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentAssignments.slice(0, 3).map((a) => (
                  <div key={a._id} className="flex items-center justify-between text-sm">
                    <span className="text-secondary-700 truncate">{a.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.submissionStatus === 'graded' ? 'bg-blue-100 text-blue-700' :
                      a.submissionStatus === 'submitted' || a.submissionStatus === 'late' ? 'bg-green-100 text-green-700' :
                      'bg-secondary-100 text-secondary-700'
                    }`}>
                      {a.submissionStatus === 'graded' ? `${a.marks}` : a.submissionStatus.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fees Card */}
          {dashboard.fees ? (
            <div className="rounded-xl bg-white p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide">💰 Fees</h3>
                <span className={`text-2xl font-bold ${dashboard.fees.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${dashboard.fees.outstanding.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1 text-xs text-secondary-500">
                <p>{dashboard.fees.invoiceCount} invoice(s), {dashboard.fees.overdueCount} overdue</p>
              </div>
              <Link to="/portal/fees"
                className="text-xs text-primary-700 hover:underline mt-2 inline-block">View Fee Details →</Link>
            </div>
          ) : (
            <div className="rounded-xl bg-secondary-50 p-5 shadow-lg border-2 border-dashed border-secondary-200">
              <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wide mb-2">💰 Fees</h3>
              <p className="text-sm text-secondary-400">No fee data available</p>
            </div>
          )}

          {/* Messages Card — Stub */}
          <div className="rounded-xl bg-secondary-50 p-5 shadow-lg border-2 border-dashed border-secondary-200">
            <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wide mb-2">✉️ Messages</h3>
            <p className="text-sm text-secondary-400">Coming soon</p>
            <p className="text-xs text-secondary-300 mt-2">Messaging will be available in a future update.</p>
          </div>

          {/* Leave Card — Stub */}
          <div className="rounded-xl bg-secondary-50 p-5 shadow-lg border-2 border-dashed border-secondary-200">
            <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wide mb-2">📅 Leave</h3>
            <p className="text-sm text-secondary-400">Coming soon</p>
            <p className="text-xs text-secondary-300 mt-2">Leave requests will be available in a future update.</p>
          </div>

          {/* Announcements Card — Stub */}
          <div className="rounded-xl bg-secondary-50 p-5 shadow-lg border-2 border-dashed border-secondary-200">
            <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-wide mb-2">📢 Announcements</h3>
            <p className="text-sm text-secondary-400">Coming soon</p>
            <p className="text-xs text-secondary-300 mt-2">Announcements will be available in a future update.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
