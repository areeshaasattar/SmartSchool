import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface SchoolSettings {
  timezone: string
  locale: string
  academicWeekStart: number
  gradingScale: string
  contact: { email: string; phone: string; address: string }
  branding: { logoUrl: string; primaryColor: string }
}

interface SchoolData {
  id: string
  name: string
  code: string
  status: string
  settings: SchoolSettings
  subscription: { plan: string; status: string; seatLimit: number }
}

export default function SchoolSettingsPage() {
  const activeSchoolId = useSelector((state: RootState) => state.tenant.activeSchoolId)
  const user = useSelector((state: RootState) => state.auth.user)
  const isSuperAdmin = user?.roles.includes('super_admin')

  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name: '',
    settings: {
      timezone: 'UTC',
      locale: 'en',
      academicWeekStart: 1,
      gradingScale: 'letter',
      contact: { email: '', phone: '', address: '' },
      branding: { logoUrl: '', primaryColor: '#3b82f6' },
    },
  })

  useEffect(() => {
    if (!activeSchoolId) return
    setLoading(true)
    api
      .get(`/schools/${activeSchoolId}`)
      .then((res) => {
        const s = res.data.school as SchoolData
        setSchool(s)
        setForm({
          name: s.name,
          settings: {
            timezone: s.settings?.timezone || 'UTC',
            locale: s.settings?.locale || 'en',
            academicWeekStart: s.settings?.academicWeekStart ?? 1,
            gradingScale: s.settings?.gradingScale || 'letter',
            contact: s.settings?.contact || { email: '', phone: '', address: '' },
            branding: s.settings?.branding || { logoUrl: '', primaryColor: '#3b82f6' },
          },
        })
      })
      .catch(() => setError('Failed to load school settings'))
      .finally(() => setLoading(false))
  }, [activeSchoolId])

  const handleSave = async () => {
    if (!activeSchoolId) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.patch(`/schools/${activeSchoolId}`, form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!activeSchoolId && !isSuperAdmin) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">No school selected. Use the school switcher in the nav bar.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading school settings...</p>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">School not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">School Settings</h2>
          <p className="mt-1 text-sm text-secondary-500">
            {school.name} ({school.code})
          </p>
        </div>
        <Link
          to="/school-settings/academic-years"
          className="rounded-lg bg-secondary-100 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-200"
        >
          Manage Academic Years →
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-accent-50 p-4 text-sm text-accent-700">Settings saved successfully!</div>
      )}

      {/* School name */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">General</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">School Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">School Code</label>
            <input
              type="text"
              value={school.code}
              disabled
              className="w-full rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-2.5 text-sm text-secondary-500"
            />
          </div>
        </div>
      </div>

      {/* Academic settings */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Academic Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Timezone</label>
            <input
              type="text"
              value={form.settings.timezone}
              onChange={(e) =>
                setForm({ ...form, settings: { ...form.settings, timezone: e.target.value } })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Locale</label>
            <input
              type="text"
              value={form.settings.locale}
              onChange={(e) =>
                setForm({ ...form, settings: { ...form.settings, locale: e.target.value } })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Week Starts On</label>
            <select
              value={form.settings.academicWeekStart}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, academicWeekStart: Number(e.target.value) },
                })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Grading Scale</label>
            <select
              value={form.settings.gradingScale}
              onChange={(e) =>
                setForm({ ...form, settings: { ...form.settings, gradingScale: e.target.value } })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="letter">Letter (A-F)</option>
              <option value="percentage">Percentage</option>
              <option value="gpa">GPA (4.0)</option>
              <option value="cbse">CBSE (10-point)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Email</label>
            <input
              type="email"
              value={form.settings.contact.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, contact: { ...form.settings.contact, email: e.target.value } },
                })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Phone</label>
            <input
              type="tel"
              value={form.settings.contact.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, contact: { ...form.settings.contact, phone: e.target.value } },
                })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-secondary-700">Address</label>
            <input
              type="text"
              value={form.settings.contact.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, contact: { ...form.settings.contact, address: e.target.value } },
                })
              }
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Branding</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Logo URL</label>
            <input
              type="url"
              value={form.settings.branding.logoUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  settings: { ...form.settings, branding: { ...form.settings.branding, logoUrl: e.target.value } },
                })
              }
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.settings.branding.primaryColor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    settings: { ...form.settings, branding: { ...form.settings.branding, primaryColor: e.target.value } },
                  })
                }
                className="h-10 w-14 rounded border border-secondary-300"
              />
              <input
                type="text"
                value={form.settings.branding.primaryColor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    settings: { ...form.settings, branding: { ...form.settings.branding, primaryColor: e.target.value } },
                  })
                }
                className="flex-1 rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
