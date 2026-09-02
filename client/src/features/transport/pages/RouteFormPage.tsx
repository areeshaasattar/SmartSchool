import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface Vehicle { _id: string; registrationNo: string; type: string; status: string }
interface Driver { _id: string; name: string; status: string }
interface Stop { _id: string; name: string }

interface RouteStop {
  stopId: string
  order: number
  estimatedTime: string
}

export default function RouteFormPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [stops, setStops] = useState<RouteStop[]>([
    { stopId: '', order: 1, estimatedTime: '07:00' },
    { stopId: '', order: 2, estimatedTime: '07:30' },
  ])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [allStops, setAllStops] = useState<Stop[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/transport/vehicles'),
      api.get('/transport/drivers'),
      api.get('/transport/stops'),
    ]).then(([vRes, dRes, sRes]) => {
      setVehicles(vRes.data.filter((v: Vehicle) => v.status === 'active'))
      setDrivers(dRes.data.filter((d: Driver) => d.status === 'active'))
      setAllStops(sRes.data)
    })
  }, [])

  const handleStopChange = (index: number, field: keyof RouteStop, value: string | number) => {
    const updated = [...stops]
    updated[index] = { ...updated[index], [field]: value }
    setStops(updated)
  }

  const addStop = () => {
    setStops([...stops, { stopId: '', order: stops.length + 1, estimatedTime: '' }])
  }

  const removeStop = (index: number) => {
    if (stops.length <= 2) return
    const updated = stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    setStops(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/transport/routes', { name, vehicleId, driverId, stops })
      navigate('/transport/routes')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create route'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Create Route</h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <label className="block text-sm font-medium text-secondary-700 mb-1">Route Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            placeholder="e.g. Route A — School to Downtown"
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Vehicle</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>{v.registrationNo} ({v.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Driver</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-secondary-900">Stops</h2>
            <button
              type="button"
              onClick={addStop}
              className="rounded-lg bg-secondary-100 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-200"
            >
              + Add Stop
            </button>
          </div>

          <div className="space-y-3">
            {stops.map((s, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                  {s.order}
                </span>
                <select
                  value={s.stopId}
                  onChange={(e) => handleStopChange(idx, 'stopId', e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select stop</option>
                  {allStops.map((st) => (
                    <option key={st._id} value={st._id}>{st.name}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={s.estimatedTime}
                  onChange={(e) => handleStopChange(idx, 'estimatedTime', e.target.value)}
                  required
                  className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                {stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStop(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/transport/routes')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name || !vehicleId || !driverId || stops.some(s => !s.stopId)}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Route'}
          </button>
        </div>
      </form>
    </div>
  )
}
