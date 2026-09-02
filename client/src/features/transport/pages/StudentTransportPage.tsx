import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface Student { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
interface RouteData { _id: string; name: string; stops: Array<{ stopId: { name: string }; estimatedTime: string }> }
interface Assignment { _id: string; studentId: Student; routeId: RouteData; stopId: { name: string; location: { lat: number; lng: number } }; status: string }

export default function StudentTransportPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isTransportView = user?.roles?.some(r => ['parent', 'student'].includes(r))

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = () => {
    setLoading(true)
    // For parents, we load their children's transport via the parent-portal children endpoint
    // For transport_manager/school_admin, we load all assignments via a different endpoint
    api.get('/parent-portal/children')
      .then(async (res) => {
        const children = res.data.children || []
        const allAssignments: Assignment[] = []
        for (const child of children) {
          try {
            const transportRes = await api.get(`/transport/student/${child.id}`)
            allAssignments.push({
              ...transportRes.data,
              studentId: { _id: child.id, admissionNo: child.admissionNo, profile: child.profile },
            })
          } catch {
            // Student may not have transport assignment
          }
        }
        setAssignments(allAssignments)
      })
      .catch(() => setError('Failed to load transport data'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">
        {isTransportView ? 'My Transport' : 'Student Transport'}
      </h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No transport assignments found</div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a._id} className="rounded-xl bg-white p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-secondary-900">
                  {a.studentId.profile.firstName} {a.studentId.profile.lastName}
                </h3>
                <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                  {a.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-secondary-50 p-3">
                  <span className="text-xs font-medium text-secondary-500">Route</span>
                  <p className="text-secondary-900">{a.routeId.name}</p>
                </div>
                <div className="rounded-lg bg-secondary-50 p-3">
                  <span className="text-xs font-medium text-secondary-500">Stop</span>
                  <p className="text-secondary-900">{a.stopId.name}</p>
                </div>
                <div className="rounded-lg bg-secondary-50 p-3">
                  <span className="text-xs font-medium text-secondary-500">Estimated Time</span>
                  <p className="text-secondary-900">
                    {a.routeId.stops.find(s => s.stopId.name === a.stopId.name)?.estimatedTime || 'N/A'}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary-50 p-3">
                  <span className="text-xs font-medium text-secondary-500">Location</span>
                  <p className="text-secondary-900 text-xs">
                    {a.stopId.location.lat.toFixed(4)}, {a.stopId.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
