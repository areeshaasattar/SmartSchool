import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [registrationNo, setRegistrationNo] = useState('')
  const [type, setType] = useState<'bus' | 'van' | 'other'>('bus')
  const [capacity, setCapacity] = useState(30)
  const [status, setStatus] = useState<'active' | 'maintenance' | 'inactive'>('active')
  const [gpsDeviceId, setGpsDeviceId] = useState('')
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get('/transport/vehicles')
      .then((res) => {
        const v = res.data.find((v: { _id: string }) => v._id === id)
        if (v) {
          setRegistrationNo(v.registrationNo)
          setType(v.type)
          setCapacity(v.capacity)
          setStatus(v.status)
          setGpsDeviceId(v.gpsDeviceId || '')
        }
      })
      .catch(() => setError('Failed to load vehicle'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = {
        registrationNo,
        type,
        capacity,
        status,
        gpsDeviceId: gpsDeviceId || undefined,
      }
      if (id) {
        await api.patch(`/transport/vehicles/${id}`, data)
      } else {
        await api.post('/transport/vehicles', data)
      }
      navigate('/transport/vehicles')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save vehicle'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">
        {id ? 'Edit Vehicle' : 'Add Vehicle'}
      </h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-lg">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Registration Number</label>
          <input
            type="text"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="bus">Bus</option>
              <option value="van">Van</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min={1}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">GPS Device ID (optional)</label>
          <input
            type="text"
            value={gpsDeviceId}
            onChange={(e) => setGpsDeviceId(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            placeholder="For future GPS tracking"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/transport/vehicles')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !registrationNo}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : id ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
