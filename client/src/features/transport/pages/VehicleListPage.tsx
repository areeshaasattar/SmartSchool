import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface Vehicle {
  _id: string
  registrationNo: string
  type: string
  capacity: number
  status: string
  gpsDeviceId?: string
}

export default function VehicleListPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/transport/vehicles')
      .then((res) => setVehicles(res.data))
      .catch(() => setError('Failed to load vehicles'))
      .finally(() => setLoading(false))
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'maintenance': return 'bg-yellow-100 text-yellow-700'
      case 'inactive': return 'bg-secondary-100 text-secondary-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Vehicles</h1>
        <Link
          to="/transport/vehicles/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Add Vehicle
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No vehicles found</div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link
              key={v._id}
              to={`/transport/vehicles/${v._id}/edit`}
              className="block rounded-xl bg-white p-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-secondary-900">{v.registrationNo}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize">{v.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(v.status)}`}>
                      {v.status}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-500">Capacity: {v.capacity} seats</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
