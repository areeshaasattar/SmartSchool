import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api'
import FormField from '../../../app/components/ui/FormField'
import FieldError from '../../../app/components/ui/FieldError'
import SectionHeading from '../../../app/components/ui/SectionHeading'
import { extractServerError, focusFirstError, type FieldErrors } from '../../../app/lib/formValidation'

interface GuardianEntry {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string
}

const GUARDIAN_PREFIX = 'guardian'

export default function StudentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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

  // ── Validation rules (mirror of server schema) ─────────────────────

  const validateField = (fieldId: string): string | undefined => {
    const gMatch = fieldId.startsWith(`${GUARDIAN_PREFIX}-`)
      ? /^guardian-(\d+)-(.+)$/.exec(fieldId)
      : null
    if (gMatch) {
      const g = guardians[Number(gMatch[1])]
      if (!g) return undefined
      const sub = gMatch[2]
      if (sub === 'relationship' && !g.relationship.trim()) return 'Relationship is required'
      if (!g.id) {
        if (sub === 'email') {
          if (!g.email.trim()) return 'Email is required for a new guardian'
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email)) return 'Enter a valid email address'
        }
        if (sub === 'firstName' && !g.firstName.trim()) return 'First name is required for a new guardian'
        if (sub === 'lastName' && !g.lastName.trim()) return 'Last name is required for a new guardian'
      }
      return undefined
    }
    switch (fieldId) {
      case 'admissionNo':
        return form.admissionNo.trim() ? undefined : 'Admission number is required'
      case 'firstName':
        return form.firstName.trim() ? undefined : 'First name is required'
      case 'lastName':
        return form.lastName.trim() ? undefined : 'Last name is required'
      case 'dob':
        if (!form.dob) return 'Date of birth is required'
        if (new Date(form.dob) >= new Date()) return 'Date of birth must be a past date'
        return undefined
      case 'emergencyName':
        return form.emergencyName.trim() ? undefined : 'Emergency contact name is required'
      case 'emergencyRelation':
        return form.emergencyRelation.trim() ? undefined : 'Relation is required'
      case 'emergencyPhone':
        return form.emergencyPhone.trim() ? undefined : 'Phone is required'
      default:
        return undefined
    }
  }

  const FIELD_IDS = [
    'admissionNo', 'firstName', 'lastName', 'dob',
    'emergencyName', 'emergencyRelation', 'emergencyPhone',
    ...guardians.flatMap((g, i) =>
      g.id
        ? [`${GUARDIAN_PREFIX}-${i}-relationship`]
        : [`${GUARDIAN_PREFIX}-${i}-relationship`, `${GUARDIAN_PREFIX}-${i}-email`, `${GUARDIAN_PREFIX}-${i}-firstName`, `${GUARDIAN_PREFIX}-${i}-lastName`]
    ),
  ]

  const validateAll = (): FieldErrors => {
    const errors: FieldErrors = {}
    for (const fid of FIELD_IDS) {
      const msg = validateField(fid)
      if (msg) errors[fid] = msg
    }
    return errors
  }

  const handleBlur = (fieldId: string) => {
    const msg = validateField(fieldId)
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (msg) next[fieldId] = msg
      else delete next[fieldId]
      return next
    })
  }

  const clearFieldError = (fieldId: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  // ── Load student if editing ────────────────────────────────────────

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
      .catch(() => setBanner('Failed to load student'))
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
    // Re-index guardian errors after removal
    setFieldErrors((prev) => {
      const next: FieldErrors = {}
      for (const [k, v] of Object.entries(prev)) {
        const m = /^guardian-(\d+)-(.+)$/.exec(k)
        if (!m) { next[k] = v; continue }
        const idx = Number(m[1])
        if (idx === index) continue
        next[idx < index ? k : `guardian-${idx - 1}-${m[2]}`] = v
      }
      return next
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setBanner(null)

    const errors = validateAll()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const count = Object.keys(errors).length
      setBanner(`${count} field${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention`)
      focusFirstError(errors)
      return
    }

    setSaving(true)

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
      const { banner: serverBanner, fieldErrors: serverFieldErrors } = extractServerError(err, 'Failed to save student', {
        aliases: {
          'emergencyContact.name': 'emergencyName',
          'emergencyContact.relation': 'emergencyRelation',
          'emergencyContact.phone': 'emergencyPhone',
        },
        guardianPrefix: GUARDIAN_PREFIX,
      })
      setBanner(serverBanner)
      setFieldErrors(serverFieldErrors)
      if (Object.keys(serverFieldErrors).length > 0) focusFirstError(serverFieldErrors)
    } finally {
      setSaving(false)
    }
  }

  // ── Section error counts ───────────────────────────────────────────

  const studentInfoErrorCount = ['admissionNo', 'firstName', 'lastName', 'dob'].filter((f) => fieldErrors[f]).length
  const emergencyErrorCount = ['emergencyName', 'emergencyRelation', 'emergencyPhone'].filter((f) => fieldErrors[f]).length
  const guardianErrorCount = Object.keys(fieldErrors).filter((k) => k.startsWith(`${GUARDIAN_PREFIX}-`)).length

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

      {banner && (
        <div role="alert" className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">
          <p className="font-medium">{banner}</p>
          {Object.entries(fieldErrors).length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {Object.entries(fieldErrors).map(([fid, msg]) => (
                <li key={fid}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Student info */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <SectionHeading title="Student Information" errorCount={studentInfoErrorCount} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="admissionNo" label="Admission No" required error={fieldErrors['admissionNo']} value={form.admissionNo} onChange={(v) => { setForm({ ...form, admissionNo: v }); clearFieldError('admissionNo') }} onBlur={() => handleBlur('admissionNo')} />
          <FormField id="firstName" label="First Name" required error={fieldErrors['firstName']} value={form.firstName} onChange={(v) => { setForm({ ...form, firstName: v }); clearFieldError('firstName') }} onBlur={() => handleBlur('firstName')} />
          <FormField id="lastName" label="Last Name" required error={fieldErrors['lastName']} value={form.lastName} onChange={(v) => { setForm({ ...form, lastName: v }); clearFieldError('lastName') }} onBlur={() => handleBlur('lastName')} />
          <FormField id="dob" label="Date of Birth" required type="date" error={fieldErrors['dob']} value={form.dob} onChange={(v) => { setForm({ ...form, dob: v }); clearFieldError('dob') }} onBlur={() => handleBlur('dob')} />
          <div>
            <label htmlFor="gender" className="mb-1 block text-sm font-medium text-secondary-700">Gender <span className="text-destructive-500">*</span></label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' | 'other' })}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${fieldErrors['gender'] ? 'border-destructive-500' : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500'}`}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FormField id="bloodGroup" label="Blood Group" value={form.bloodGroup} onChange={(v) => setForm({ ...form, bloodGroup: v })} placeholder="e.g. O+" />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <SectionHeading title="Emergency Contact" errorCount={emergencyErrorCount} />
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="emergencyName" label="Name" required error={fieldErrors['emergencyName']} value={form.emergencyName} onChange={(v) => { setForm({ ...form, emergencyName: v }); clearFieldError('emergencyName') }} onBlur={() => handleBlur('emergencyName')} />
          <FormField id="emergencyRelation" label="Relation" required error={fieldErrors['emergencyRelation']} value={form.emergencyRelation} onChange={(v) => { setForm({ ...form, emergencyRelation: v }); clearFieldError('emergencyRelation') }} onBlur={() => handleBlur('emergencyRelation')} />
          <FormField id="emergencyPhone" label="Phone" required type="tel" error={fieldErrors['emergencyPhone']} value={form.emergencyPhone} onChange={(v) => { setForm({ ...form, emergencyPhone: v }); clearFieldError('emergencyPhone') }} onBlur={() => handleBlur('emergencyPhone')} />
        </div>
      </div>

      {/* Guardians */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <SectionHeading title="Guardians" errorCount={guardianErrorCount} />
          </div>
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
                  <FormField id={`${GUARDIAN_PREFIX}-${i}-relationship`} label="Relationship" required error={fieldErrors[`${GUARDIAN_PREFIX}-${i}-relationship`]} value={g.relationship} onChange={(v) => { updateGuardian(i, 'relationship', v); clearFieldError(`${GUARDIAN_PREFIX}-${i}-relationship`) }} onBlur={() => handleBlur(`${GUARDIAN_PREFIX}-${i}-relationship`)} placeholder="e.g. Mother" />
                  <FormField id={`${GUARDIAN_PREFIX}-${i}-email`} label="Email" required={!g.id} type="email" error={fieldErrors[`${GUARDIAN_PREFIX}-${i}-email`]} value={g.email} onChange={(v) => { updateGuardian(i, 'email', v); clearFieldError(`${GUARDIAN_PREFIX}-${i}-email`) }} onBlur={() => handleBlur(`${GUARDIAN_PREFIX}-${i}-email`)} />
                  <FormField id={`${GUARDIAN_PREFIX}-${i}-firstName`} label="First Name" required={!g.id} error={fieldErrors[`${GUARDIAN_PREFIX}-${i}-firstName`]} value={g.firstName} onChange={(v) => { updateGuardian(i, 'firstName', v); clearFieldError(`${GUARDIAN_PREFIX}-${i}-firstName`) }} onBlur={() => handleBlur(`${GUARDIAN_PREFIX}-${i}-firstName`)} />
                  <FormField id={`${GUARDIAN_PREFIX}-${i}-lastName`} label="Last Name" required={!g.id} error={fieldErrors[`${GUARDIAN_PREFIX}-${i}-lastName`]} value={g.lastName} onChange={(v) => { updateGuardian(i, 'lastName', v); clearFieldError(`${GUARDIAN_PREFIX}-${i}-lastName`) }} onBlur={() => handleBlur(`${GUARDIAN_PREFIX}-${i}-lastName`)} />
                  <FormField id={`${GUARDIAN_PREFIX}-${i}-phone`} label="Phone" type="tel" error={fieldErrors[`${GUARDIAN_PREFIX}-${i}-phone`]} value={g.phone} onChange={(v) => updateGuardian(i, 'phone', v)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {guardianErrorCount > 0 && <FieldError message={`${guardianErrorCount} guardian field${guardianErrorCount === 1 ? '' : 's'} need attention`} />}
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
