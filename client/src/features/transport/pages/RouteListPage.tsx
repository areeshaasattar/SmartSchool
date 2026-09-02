import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface RouteData {
  _id: string
  name: string
  vehicleId: { registrationNo: string; type: string; capacity: number } | string
  driverId: { name: string; phone: string } | string
  stops: Array<{ stopId: string; order: number; estimatedTime: string }>
}

export default function RouteListPage() {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/transport/routes')
      .then((res) => setRoutes(res.data))
      .catch(() => setError('Failed to load routes'))
      .finally(() => setLoading(false))
  }, [])

  const getVehicleName = (vehicleId: RouteData['vehicleId']) => {
    if (typeof vehicleId === 'object') return vehicleId.registrationNo
    return 'Unknown'
  }

  const getDriverName = (driverId: RouteData['driverId']) => {
    if (typeof driverId === 'object') return driverId.name
    return 'Unknown'
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Transport Routes</h1>
        <Link
          to="/transport/routes/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Add Route
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : routes.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No routes found</div>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => (
            <Link
              key={r._id}
              to={`/transport/routes/${r._id}`}
              className="block rounded-xl bg-white p-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-secondary-900">{r.name}</span>
                  <div className="flex items-center gap-3 mt-1 text-xs text-secondary-500">
                    <span>🚌 {getVehicleName(r.vehicleId)}</span>
                    <span>👤 {getDriverName(r.driverId)}</span>
                    <span>📍 {r.stops.length} stops</span>
                  </div>
                </div>
                <span className="text-xs text-secondary-400">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
