import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

export default function DriverFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [loading, setLoading] = useState(!!id)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get('/transport/drivers')
      .then((res) => {
        const d = res.data.find((d: { _id: string }) => d._id === id)
        if (d) {
          setName(d.name)
          setPhone(d.phone)
          setLicenseNo(d.licenseNo)
          setLicenseExpiry(new Date(d.licenseExpiry).toISOString().split('T')[0])
          setStatus(d.status)
        }
      })
      .catch(() => setError('Failed to load driver'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = { name, phone, licenseNo, licenseExpiry, status }
      if (id) {
        await api.patch(`/transport/drivers/${id}`, data)
      } else {
        await api.post('/transport/drivers', data)
      }
      navigate('/transport/drivers')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save driver'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">
        {id ? 'Edit Driver' : 'Add Driver'}
      </h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-lg">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">License Number</label>
            <input
              type="text"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">License Expiry</label>
            <input
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/transport/drivers')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name || !licenseNo}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : id ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
