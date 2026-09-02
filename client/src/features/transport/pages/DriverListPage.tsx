import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface Driver {
  _id: string
  name: string
  phone: string
  licenseNo: string
  licenseExpiry: string
  status: string
}

export default function DriverListPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/transport/drivers')
      .then((res) => setDrivers(res.data))
      .catch(() => setError('Failed to load drivers'))
      .finally(() => setLoading(false))
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'inactive': return 'bg-secondary-100 text-secondary-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Drivers</h1>
        <Link
          to="/transport/drivers/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Add Driver
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : drivers.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No drivers found</div>
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => (
            <Link
              key={d._id}
              to={`/transport/drivers/${d._id}/edit`}
              className="block rounded-xl bg-white p-4 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-secondary-900">{d.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-500">License: {d.licenseNo} • Expires: {new Date(d.licenseExpiry).toLocaleDateString()}</p>
                  <p className="text-xs text-secondary-400">{d.phone}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
