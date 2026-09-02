import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface AcademicYear {
  id: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export default function AcademicYearsPage() {
  const activeSchoolId = useSelector((state: RootState) => state.tenant.activeSchoolId)

  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    label: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  })

  const loadYears = useCallback(() => {
    if (!activeSchoolId) return
    setLoading(true)
    api
      .get(`/schools/${activeSchoolId}/academic-years`)
      .then((res) => setYears(res.data.academicYears))
      .catch(() => setError('Failed to load academic years'))
      .finally(() => setLoading(false))
  }, [activeSchoolId])

  useEffect(() => {
    loadYears()
  }, [loadYears])

  const resetForm = () => {
    setForm({ label: '', startDate: '', endDate: '', isCurrent: false })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!activeSchoolId) return
    setError(null)
    try {
      if (editingId) {
        await api.patch(`/schools/${activeSchoolId}/academic-years/${editingId}`, form)
      } else {
        await api.post(`/schools/${activeSchoolId}/academic-years`, form)
      }
      resetForm()
      loadYears()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; details?: { message: string }[] } } }
      const msg =
        axiosErr.response?.data?.details?.[0]?.message ||
        axiosErr.response?.data?.error ||
        'Failed to save academic year'
      setError(msg)
    }
  }

  const handleEdit = (year: AcademicYear) => {
    setForm({
      label: year.label,
      startDate: year.startDate.split('T')[0],
      endDate: year.endDate.split('T')[0],
      isCurrent: year.isCurrent,
    })
    setEditingId(year.id)
    setShowForm(true)
  }

  const handleMarkCurrent = async (yearId: string) => {
    if (!activeSchoolId) return
    setError(null)
    try {
      await api.patch(`/schools/${activeSchoolId}/academic-years/${yearId}`, { isCurrent: true })
      loadYears()
    } catch {
      setError('Failed to mark as current')
    }
  }

  if (!activeSchoolId) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">No school selected.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Academic Years</h2>
          <p className="mt-1 text-sm text-secondary-500">Manage academic year periods for your school</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/school-settings"
            className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            ← Settings
          </Link>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + New Academic Year
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">
            {editingId ? 'Edit Academic Year' : 'New Academic Year'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. 2025-2026"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-secondary-700">
                <input
                  type="checkbox"
                  checked={form.isCurrent}
                  onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                  className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                />
                Current
              </label>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={resetForm}
                className="rounded-lg border border-secondary-300 px-4 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Years list */}
      <div className="rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : years.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">
            No academic years configured yet. Click "New Academic Year" to get started.
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {years.map((year) => (
              <div key={year.id} className="flex items-center justify-between p-4 hover:bg-secondary-50">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-secondary-900">{year.label}</span>
                      {year.isCurrent && (
                        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-secondary-500">
                      {new Date(year.startDate).toLocaleDateString()} —{' '}
                      {new Date(year.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!year.isCurrent && (
                    <button
                      onClick={() => handleMarkCurrent(year.id)}
                      className="rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      Set as Current
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(year)}
                    className="rounded-lg border border-secondary-300 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
