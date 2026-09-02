import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api'

export default function TeacherFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    employeeNo: '',
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    phone: '',
    photoUrl: '',
    designation: '',
    joiningDate: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract',
    departments: '',
    subjects: '',
  })

  const [userForm, setUserForm] = useState({
    userId: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  })

  const [qualifications, setQualifications] = useState<Array<{ degree: string; institution: string; year: number }>>([])

  // Load teacher if editing
  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .get(`/teachers/${id}`)
      .then((res) => {
        const t = res.data.teacher
        setForm({
          employeeNo: t.employeeNo,
          firstName: t.profile.firstName,
          lastName: t.profile.lastName,
          dob: t.profile.dob ? new Date(t.profile.dob).toISOString().split('T')[0] : '',
          gender: t.profile.gender || '',
          phone: t.profile.phone || '',
          photoUrl: t.profile.photoUrl || '',
          designation: t.employment.designation,
          joiningDate: t.employment.joiningDate ? new Date(t.employment.joiningDate).toISOString().split('T')[0] : '',
          employmentType: t.employment.employmentType,
          departments: (t.departments || []).join(', '),
          subjects: (t.subjects || []).join(', '),
        })
        if (t.qualifications?.length) {
          setQualifications(t.qualifications)
        }
        // Set linked user info
        setUserForm({
          userId: t.userId || '',
          email: t.email || '',
          firstName: '',
          lastName: '',
          phone: '',
        })
      })
      .catch(() => setError('Failed to load teacher'))
      .finally(() => setLoading(false))
  }, [id])

  const addQualification = () => {
    setQualifications([...qualifications, { degree: '', institution: '', year: new Date().getFullYear() }])
  }

  const updateQualification = (index: number, field: string, value: string | number) => {
    const updated = [...qualifications]
    updated[index] = { ...updated[index], [field]: value }
    setQualifications(updated)
  }

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      employeeNo: form.employeeNo,
      profile: {
        firstName: form.firstName,
        lastName: form.lastName,
        ...(form.dob && { dob: form.dob }),
        ...(form.gender && { gender: form.gender }),
        ...(form.phone && { phone: form.phone }),
        ...(form.photoUrl && { photoUrl: form.photoUrl }),
      },
      employment: {
        designation: form.designation,
        joiningDate: form.joiningDate,
        employmentType: form.employmentType,
      },
      departments: form.departments ? form.departments.split(',').map((d) => d.trim()).filter(Boolean) : [],
      subjects: form.subjects ? form.subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
      qualifications: qualifications.filter((q) => q.degree),
    }

    // User account
    if (isEdit) {
      // Don't send user data on edit
    } else {
      if (userForm.userId) {
        payload.user = { userId: userForm.userId }
      } else {
        payload.user = {
          email: userForm.email,
          firstName: userForm.firstName || form.firstName,
          lastName: userForm.lastName || form.lastName,
          phone: userForm.phone || form.phone,
        }
      }
    }

    try {
      if (isEdit) {
        await api.patch(`/teachers/${id}`, payload)
      } else {
        await api.post('/teachers', payload)
      }
      navigate('/teachers')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Failed to save teacher')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading teacher...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">
        {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
      </h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Teacher info */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Teacher Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Employee No *</label>
            <input
              type="text"
              value={form.employeeNo}
              onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">First Name *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Last Name *</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Date of Birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Employment */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Employment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Designation *</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g. Senior Teacher"
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Joining Date *</label>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Employment Type *</label>
            <select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value as 'full_time' | 'part_time' | 'contract' })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Departments</label>
            <input
              type="text"
              value={form.departments}
              onChange={(e) => setForm({ ...form, departments: e.target.value })}
              placeholder="Comma-separated, e.g. Math, Science"
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Subjects</label>
            <input
              type="text"
              value={form.subjects}
              onChange={(e) => setForm({ ...form, subjects: e.target.value })}
              placeholder="Comma-separated, e.g. Algebra, Physics"
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* User account (create only) */}
      {!isEdit && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">User Account</h3>
          <p className="mb-4 text-sm text-secondary-500">
            Link an existing user by ID, or provide email to create a new account with teacher role.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Existing User ID</label>
              <input
                type="text"
                value={userForm.userId}
                onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
                placeholder="Or create new below"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Email *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">First Name</label>
              <input
                type="text"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                placeholder="Defaults to teacher first name"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary-700">Last Name</label>
              <input
                type="text"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                placeholder="Defaults to teacher last name"
                className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Qualifications */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900">Qualifications</h3>
          <button
            type="button"
            onClick={addQualification}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            + Add
          </button>
        </div>
        {qualifications.length === 0 ? (
          <p className="text-sm text-secondary-500">No qualifications added.</p>
        ) : (
          <div className="space-y-3">
            {qualifications.map((q, i) => (
              <div key={i} className="flex items-end gap-3 rounded-lg border border-secondary-200 p-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">Degree *</label>
                  <input
                    type="text"
                    value={q.degree}
                    onChange={(e) => updateQualification(i, 'degree', e.target.value)}
                    className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">Institution *</label>
                  <input
                    type="text"
                    value={q.institution}
                    onChange={(e) => updateQualification(i, 'institution', e.target.value)}
                    className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-secondary-600">Year *</label>
                  <input
                    type="number"
                    value={q.year}
                    onChange={(e) => updateQualification(i, 'year', parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeQualification(i)}
                  className="rounded border border-destructive-300 px-2 py-2 text-xs text-destructive-600 hover:bg-destructive-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/teachers')}
          className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Teacher' : 'Create Teacher'}
        </button>
      </div>
    </div>
  )
}
