import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api'

interface GuardianEntry {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string
}

export default function StudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    admissionNo: '',
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodGroup: '',
    photoUrl: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
  })

  const [guardians, setGuardians] = useState<GuardianEntry[]>([])

  // Load student if editing
  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .get(`/students/${id}`)
      .then((res) => {
        const s = res.data.student
        setForm({
          admissionNo: s.admissionNo,
          firstName: s.profile.firstName,
          lastName: s.profile.lastName,
          dob: s.profile.dob ? new Date(s.profile.dob).toISOString().split('T')[0] : '',
          gender: s.profile.gender,
          bloodGroup: s.profile.bloodGroup || '',
          photoUrl: s.profile.photoUrl || '',
          emergencyName: s.emergencyContact.name,
          emergencyRelation: s.emergencyContact.relation,
          emergencyPhone: s.emergencyContact.phone,
        })
      })
      .catch(() => setError('Failed to load student'))
      .finally(() => setLoading(false))
  }, [id])

  const addGuardian = () => {
    setGuardians([...guardians, { email: '', firstName: '', lastName: '', phone: '', relationship: '' }])
  }

  const updateGuardian = (index: number, field: keyof GuardianEntry, value: string) => {
    const updated = [...guardians]
    updated[index] = { ...updated[index], [field]: value }
    setGuardians(updated)
  }

  const removeGuardian = (index: number) => {
    setGuardians(guardians.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    const payload = {
      admissionNo: form.admissionNo,
      profile: {
        firstName: form.firstName,
        lastName: form.lastName,
        dob: form.dob,
        gender: form.gender,
        bloodGroup: form.bloodGroup || undefined,
        photoUrl: form.photoUrl || undefined,
      },
      emergencyContact: {
        name: form.emergencyName,
        relation: form.emergencyRelation,
        phone: form.emergencyPhone,
      },
      guardians: guardians
        .filter((g) => g.relationship)
        .map((g) => ({
          guardianId: g.id || undefined,
          email: g.email || undefined,
          firstName: g.firstName || undefined,
          lastName: g.lastName || undefined,
          phone: g.phone || undefined,
          relationship: g.relationship,
        })),
    }

    try {
      if (isEdit) {
        await api.patch(`/students/${id}`, payload)
      } else {
        await api.post('/students', payload)
      }
      navigate('/students')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Failed to save student')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading student...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">
        {isEdit ? 'Edit Student' : 'Add New Student'}
      </h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Student info */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Student Information</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Admission No *</label>
            <input
              type="text"
              value={form.admissionNo}
              onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
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
            <label className="mb-1 block text-sm font-medium text-secondary-700">Date of Birth *</label>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Gender *</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' | 'other' })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Blood Group</label>
            <input
              type="text"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              placeholder="e.g. O+"
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-secondary-900">Emergency Contact *</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Name *</label>
            <input
              type="text"
              value={form.emergencyName}
              onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Relation *</label>
            <input
              type="text"
              value={form.emergencyRelation}
              onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-700">Phone *</label>
            <input
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Guardians */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900">Guardians</h3>
          <button
            type="button"
            onClick={addGuardian}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            + Add Guardian
          </button>
        </div>

        {guardians.length === 0 ? (
          <p className="text-sm text-secondary-500">No guardians added. Click "Add Guardian" to link one.</p>
        ) : (
          <div className="space-y-4">
            {guardians.map((g, i) => (
              <div key={i} className="rounded-lg border border-secondary-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary-700">Guardian {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeGuardian(i)}
                    className="text-xs text-destructive-600 hover:text-destructive-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary-600">Relationship *</label>
                    <input
                      type="text"
                      value={g.relationship}
                      onChange={(e) => updateGuardian(i, 'relationship', e.target.value)}
                      placeholder="e.g. Mother"
                      className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary-600">Email</label>
                    <input
                      type="email"
                      value={g.email}
                      onChange={(e) => updateGuardian(i, 'email', e.target.value)}
                      className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary-600">First Name</label>
                    <input
                      type="text"
                      value={g.firstName}
                      onChange={(e) => updateGuardian(i, 'firstName', e.target.value)}
                      className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary-600">Last Name</label>
                    <input
                      type="text"
                      value={g.lastName}
                      onChange={(e) => updateGuardian(i, 'lastName', e.target.value)}
                      className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-secondary-600">Phone</label>
                    <input
                      type="tel"
                      value={g.phone}
                      onChange={(e) => updateGuardian(i, 'phone', e.target.value)}
                      className="w-full rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate('/students')}
          className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Student' : 'Create Student'}
        </button>
      </div>
    </div>
  )
}
