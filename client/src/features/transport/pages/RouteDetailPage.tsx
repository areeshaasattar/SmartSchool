import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface RouteDetail {
  route: {
    _id: string
    name: string
    vehicleId: { registrationNo: string; type: string; capacity: number; status: string }
    driverId: { name: string; phone: string; licenseNo: string; status: string }
    stops: Array<{ stopId: { _id: string; name: string; location: { lat: number; lng: number } }; order: number; estimatedTime: string }>
  }
  studentCount: number
}

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<RouteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/transport/routes/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load route'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (!data) return <div className="text-center text-secondary-500 py-8">Route not found</div>

  const { route, studentCount } = data

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button onClick={() => navigate('/transport/routes')} className="text-sm text-primary-600 hover:underline mb-4">
        ← Back to Routes
      </button>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-4">{route.name}</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-secondary-50 p-3">
            <span className="text-xs font-medium text-secondary-500">Vehicle</span>
            <p className="text-sm font-medium text-secondary-900">
              {route.vehicleId.registrationNo} ({route.vehicleId.type})
            </p>
            <p className="text-xs text-secondary-400">Capacity: {route.vehicleId.capacity}</p>
          </div>
          <div className="rounded-lg bg-secondary-50 p-3">
            <span className="text-xs font-medium text-secondary-500">Driver</span>
            <p className="text-sm font-medium text-secondary-900">{route.driverId.name}</p>
            <p className="text-xs text-secondary-400">{route.driverId.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-secondary-600">
          <span>📍 {route.stops.length} stops</span>
          <span>👥 {studentCount} students assigned</span>
        </div>
      </div>

      {/* Stops */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-secondary-900 mb-4">Stops</h2>
        <div className="space-y-3">
          {route.stops
            .sort((a, b) => a.order - b.order)
            .map((s, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg bg-secondary-50 p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                  {s.order}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-secondary-900">{s.stopId.name}</span>
                  <p className="text-xs text-secondary-400">
                    {s.stopId.location.lat.toFixed(4)}, {s.stopId.location.lng.toFixed(4)}
                  </p>
                </div>
                <span className="text-sm text-secondary-500">{s.estimatedTime}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
