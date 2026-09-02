import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface Stop {
  _id: string
  name: string
  location: { lat: number; lng: number }
  routeIds: string[]
}

export default function StopListPage() {
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadStops()
  }, [])

  const loadStops = () => {
    setLoading(true)
    api.get('/transport/stops')
      .then((res) => setStops(res.data))
      .catch(() => setError('Failed to load stops'))
      .finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/transport/stops', {
        name,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      })
      setName('')
      setLat('')
      setLng('')
      setShowForm(false)
      loadStops()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create stop'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Stops</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : '+ Add Stop'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 shadow-lg mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Stop name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              step="any"
              required
              className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              step="any"
              required
              className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !name || !lat || !lng}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Stop'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : stops.length === 0 ? (
        <div className="text-center text-secondary-400 py-8">No stops found</div>
      ) : (
        <div className="space-y-2">
          {stops.map((s) => (
            <div key={s._id} className="rounded-xl bg-white p-3 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-secondary-900">{s.name}</span>
                <span className="text-xs text-secondary-400 ml-2">
                  ({s.location.lat.toFixed(4)}, {s.location.lng.toFixed(4)})
                </span>
              </div>
              <span className="text-xs text-secondary-400">{s.routeIds.length} route(s)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
