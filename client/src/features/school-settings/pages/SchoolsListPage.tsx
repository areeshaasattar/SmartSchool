import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface School {
  id: string
  name: string
  code: string
  status: string
  academicYearCount: number
  currentYear: { label: string } | null
  subscription: { plan: string; seatLimit: number }
  createdAt: string
}

export default function SchoolsListPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', code: '' })
  const [creating, setCreating] = useState(false)

  const loadSchools = () => {
    setLoading(true)
    api
      .get('/schools')
      .then((res) => setSchools(res.data.schools))
      .catch(() => setError('Failed to load schools'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSchools()
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      await api.post('/schools', form)
      setForm({ name: '', code: '' })
      setShowCreate(false)
      loadSchools()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Failed to create school')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">All Schools</h2>
          <p className="mt-1 text-sm text-secondary-500">Manage all schools in the platform</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showCreate ? 'Cancel' : '+ New School'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {showCreate && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Create School</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-secondary-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="School name"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-secondary-700">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SC001"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.code}
                className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : schools.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">No schools found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Code</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Current Year</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Plan</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-medium text-secondary-900">{school.name}</td>
                    <td className="px-4 py-3 text-secondary-600">{school.code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          school.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : school.status === 'suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-secondary-100 text-secondary-700'
                        }`}
                      >
                        {school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-600">
                      {school.currentYear?.label || (
                        <span className="text-secondary-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary-600">
                      {school.subscription?.plan || 'free'}
                    </td>
                    <td className="px-4 py-3 text-secondary-500">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
