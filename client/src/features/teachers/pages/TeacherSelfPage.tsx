import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface TeacherSelf {
  id: string
  employeeNo: string
  profile: { firstName: string; lastName: string; phone?: string; photoUrl?: string; dob?: string; gender?: string }
  employment: { designation: string; joiningDate: string; employmentType: string; status: string }
  qualifications: Array<{ degree: string; institution: string; year: number }>
  departments: string[]
  subjects: string[]
}

export default function TeacherSelfPage() {
  const [teacher, setTeacher] = useState<TeacherSelf | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    api
      .get('/teachers/me')
      .then((res) => {
        const t = res.data.teacher
        setTeacher(t)
        setPhone(t.profile.phone || '')
        setPhotoUrl(t.profile.photoUrl || '')
      })
      .catch(() => setError('Failed to load your profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!teacher) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await api.patch(`/teachers/${teacher.id}`, {
        profile: { phone, photoUrl },
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading your profile...</p>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">{error || 'Teacher profile not found'}</p>
      </div>
    )
  }

  const { profile, employment, qualifications } = teacher

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">My Profile</h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-accent-50 p-4 text-sm text-accent-700">Profile updated successfully!</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile info (read-only) */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Profile</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Full Name</dt>
              <dd className="text-sm font-medium text-secondary-900">{profile.firstName} {profile.lastName}</dd>
            </div>
            {profile.dob && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Date of Birth</dt>
                <dd className="text-secondary-900">{new Date(profile.dob).toLocaleDateString()}</dd>
              </div>
            )}
            {profile.gender && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Gender</dt>
                <dd className="capitalize text-secondary-900">{profile.gender}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Employment (read-only) */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Employment</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Employee No</dt>
              <dd className="font-mono text-secondary-900">{teacher.employeeNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Designation</dt>
              <dd className="font-medium text-secondary-900">{employment.designation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Type</dt>
              <dd className="capitalize text-secondary-900">{employment.employmentType.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Status</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    employment.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : employment.status === 'on_leave'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-secondary-100 text-secondary-700'
                  }`}
                >
                  {employment.status}
                </span>
              </dd>
            </div>
            {teacher.departments.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Departments</dt>
                <dd className="text-secondary-900">{teacher.departments.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Self-editable fields */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Update Contact Info</h3>
          <p className="mb-4 text-sm text-secondary-500">You can update your phone number and profile photo.</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Photo URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Qualifications (read-only) */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Qualifications</h3>
          {qualifications.length === 0 ? (
            <p className="text-sm text-secondary-500">No qualifications listed.</p>
          ) : (
            <div className="space-y-2">
              {qualifications.map((q, i) => (
                <div key={i} className="rounded-lg border border-secondary-200 p-3">
                  <p className="font-medium text-secondary-900">{q.degree}</p>
                  <p className="text-sm text-secondary-500">{q.institution} · {q.year}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
