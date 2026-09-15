import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../../services/api'
import FormField from '../../../app/components/ui/FormField'
import SectionHeading from '../../../app/components/ui/SectionHeading'
import { extractServerError, focusFirstError, type FieldErrors } from '../../../app/lib/formValidation'

const QUAL_PREFIX = 'qual'

export default function TeacherFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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

  // ── Validation rules (mirror of createTeacherSchema) ───────────────

  const validateField = (fieldId: string): string | undefined => {
    const qMatch = /^qual-(\d+)-(.+)$/.exec(fieldId)
    if (qMatch) {
      const q = qualifications[Number(qMatch[1])]
      if (!q) return undefined
      if (qMatch[2] === 'degree' && !q.degree.trim()) return 'Degree is required'
      if (qMatch[2] === 'institution' && !q.institution.trim()) return 'Institution is required'
      if (qMatch[2] === 'year' && (!q.year || q.year < 1900 || q.year > 2100)) return 'Enter a valid year (1900–2100)'
      return undefined
    }
    switch (fieldId) {
      case 'employeeNo':
        return form.employeeNo.trim() ? undefined : 'Employee number is required'
      case 'firstName':
        return form.firstName.trim() ? undefined : 'First name is required'
      case 'lastName':
        return form.lastName.trim() ? undefined : 'Last name is required'
      case 'designation':
        return form.designation.trim() ? undefined : 'Designation is required'
      case 'joiningDate':
        if (!form.joiningDate) return 'Joining date is required'
        if (isNaN(new Date(form.joiningDate).getTime())) return 'Invalid joining date'
        return undefined
      case 'user-email':
      case 'user-firstName':
      case 'user-lastName': {
        if (isEdit || userForm.userId.trim()) return undefined
        if (fieldId === 'user-email' && !userForm.email.trim()) return 'Email is required to create a user account'
        if (fieldId === 'user-email' && userForm.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(userForm.email)) return 'Enter a valid email address'
        if (fieldId === 'user-firstName' && !userForm.firstName.trim()) return 'First name is required to create a user account'
        if (fieldId === 'user-lastName' && !userForm.lastName.trim()) return 'Last name is required to create a user account'
        return undefined
      }
      default:
        return undefined
    }
  }

  const FIELD_IDS = [
    'employeeNo', 'firstName', 'lastName', 'designation', 'joiningDate',
    ...(isEdit || userForm.userId.trim()
      ? []
      : ['user-email', 'user-firstName', 'user-lastName']),
    ...qualifications.flatMap((_, i) => [`${QUAL_PREFIX}-${i}-degree`, `${QUAL_PREFIX}-${i}-institution`, `${QUAL_PREFIX}-${i}-year`]),
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

  // ── Load teacher if editing ────────────────────────────────────────

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
        setUserForm({
          userId: t.userId || '',
          email: t.email || '',
          firstName: '',
          lastName: '',
          phone: '',
        })
      })
      .catch(() => setBanner('Failed to load teacher'))
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
    setFieldErrors((prev) => {
      const next: FieldErrors = {}
      for (const [k, v] of Object.entries(prev)) {
        const m = /^qual-(\d+)-(.+)$/.exec(k)
        if (!m) { next[k] = v; continue }
        const idx = Number(m[1])
        if (idx === index) continue
        next[idx < index ? k : `${QUAL_PREFIX}-${idx - 1}-${m[2]}`] = v
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
      const { banner: serverBanner, fieldErrors: serverFieldErrors } = extractServerError(err, 'Failed to save teacher', {
        aliases: {
          'employment.designation': 'designation',
          'employment.joiningDate': 'joiningDate',
          'user.email': 'user-email',
          'user.firstName': 'user-firstName',
          'user.lastName': 'user-lastName',
          user: 'user-email',
        },
        guardianPrefix: QUAL_PREFIX,
      })
      setBanner(serverBanner)
      setFieldErrors(serverFieldErrors)
      if (Object.keys(serverFieldErrors).length > 0) focusFirstError(serverFieldErrors)
    } finally {
      setSaving(false)
    }
  }

  // ── Section error counts ───────────────────────────────────────────

  const infoErrorCount = ['employeeNo', 'firstName', 'lastName'].filter((f) => fieldErrors[f]).length
  const employmentErrorCount = ['designation', 'joiningDate'].filter((f) => fieldErrors[f]).length
  const userErrorCount = ['user-email', 'user-firstName', 'user-lastName'].filter((f) => fieldErrors[f]).length
  const qualErrorCount = Object.keys(fieldErrors).filter((k) => k.startsWith(`${QUAL_PREFIX}-`)).length

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

      {/* Teacher info */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <SectionHeading title="Teacher Information" errorCount={infoErrorCount} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="employeeNo" label="Employee No" required error={fieldErrors['employeeNo']} value={form.employeeNo} onChange={(v) => { setForm({ ...form, employeeNo: v }); clearFieldError('employeeNo') }} onBlur={() => handleBlur('employeeNo')} />
          <FormField id="firstName" label="First Name" required error={fieldErrors['firstName']} value={form.firstName} onChange={(v) => { setForm({ ...form, firstName: v }); clearFieldError('firstName') }} onBlur={() => handleBlur('firstName')} />
          <FormField id="lastName" label="Last Name" required error={fieldErrors['lastName']} value={form.lastName} onChange={(v) => { setForm({ ...form, lastName: v }); clearFieldError('lastName') }} onBlur={() => handleBlur('lastName')} />
          <FormField id="dob" label="Date of Birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
          <div>
            <label htmlFor="gender" className="mb-1 block text-sm font-medium text-secondary-700">Gender</label>
            <select
              id="gender"
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
          <FormField id="phone" label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
      </div>

      {/* Employment */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <SectionHeading title="Employment" errorCount={employmentErrorCount} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="designation" label="Designation" required error={fieldErrors['designation']} value={form.designation} onChange={(v) => { setForm({ ...form, designation: v }); clearFieldError('designation') }} onBlur={() => handleBlur('designation')} placeholder="e.g. Senior Teacher" />
          <FormField id="joiningDate" label="Joining Date" required type="date" error={fieldErrors['joiningDate']} value={form.joiningDate} onChange={(v) => { setForm({ ...form, joiningDate: v }); clearFieldError('joiningDate') }} onBlur={() => handleBlur('joiningDate')} />
          <div>
            <label htmlFor="employmentType" className="mb-1 block text-sm font-medium text-secondary-700">Employment Type <span className="text-destructive-500">*</span></label>
            <select
              id="employmentType"
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value as 'full_time' | 'part_time' | 'contract' })}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <FormField id="departments" label="Departments" value={form.departments} onChange={(v) => setForm({ ...form, departments: v })} placeholder="Comma-separated, e.g. Math, Science" />
          <FormField id="subjects" label="Subjects" value={form.subjects} onChange={(v) => setForm({ ...form, subjects: v })} placeholder="Comma-separated, e.g. Algebra, Physics" />
        </div>
      </div>

      {/* User account (create only) */}
      {!isEdit && (
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <SectionHeading title="User Account" errorCount={userErrorCount} />
          <p className="mb-4 text-sm text-secondary-500">
            Link an existing user by ID, or provide email to create a new account with teacher role.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField id="user-userId" label="Existing User ID" value={userForm.userId} onChange={(v) => { setUserForm({ ...userForm, userId: v }); clearFieldError('user-email'); clearFieldError('user-firstName'); clearFieldError('user-lastName') }} placeholder="Or create new below" />
            <FormField id="user-email" label="Email" required={!userForm.userId} type="email" error={fieldErrors['user-email']} value={userForm.email} onChange={(v) => { setUserForm({ ...userForm, email: v }); clearFieldError('user-email') }} onBlur={() => handleBlur('user-email')} />
            <FormField id="user-firstName" label="First Name" required={!userForm.userId} error={fieldErrors['user-firstName']} value={userForm.firstName} onChange={(v) => { setUserForm({ ...userForm, firstName: v }); clearFieldError('user-firstName') }} onBlur={() => handleBlur('user-firstName')} placeholder="Defaults to teacher first name" />
            <FormField id="user-lastName" label="Last Name" required={!userForm.userId} error={fieldErrors['user-lastName']} value={userForm.lastName} onChange={(v) => { setUserForm({ ...userForm, lastName: v }); clearFieldError('user-lastName') }} onBlur={() => handleBlur('user-lastName')} placeholder="Defaults to teacher last name" />
          </div>
        </div>
      )}

      {/* Qualifications */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <SectionHeading title="Qualifications" errorCount={qualErrorCount} />
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
              <div key={i} className="flex items-start gap-3 rounded-lg border border-secondary-200 p-3">
                <div className="flex-1">
                  <FormField id={`${QUAL_PREFIX}-${i}-degree`} label="Degree" required error={fieldErrors[`${QUAL_PREFIX}-${i}-degree`]} value={q.degree} onChange={(v) => { updateQualification(i, 'degree', v); clearFieldError(`${QUAL_PREFIX}-${i}-degree`) }} onBlur={() => handleBlur(`${QUAL_PREFIX}-${i}-degree`)} />
                </div>
                <div className="flex-1">
                  <FormField id={`${QUAL_PREFIX}-${i}-institution`} label="Institution" required error={fieldErrors[`${QUAL_PREFIX}-${i}-institution`]} value={q.institution} onChange={(v) => { updateQualification(i, 'institution', v); clearFieldError(`${QUAL_PREFIX}-${i}-institution`) }} onBlur={() => handleBlur(`${QUAL_PREFIX}-${i}-institution`)} />
                </div>
                <div className="w-24">
                  <FormField id={`${QUAL_PREFIX}-${i}-year`} label="Year" required type="number" error={fieldErrors[`${QUAL_PREFIX}-${i}-year`]} value={String(q.year)} onChange={(v) => { updateQualification(i, 'year', parseInt(v) || 0); clearFieldError(`${QUAL_PREFIX}-${i}-year`) }} onBlur={() => handleBlur(`${QUAL_PREFIX}-${i}-year`)} />
                </div>
                <button
                  type="button"
                  onClick={() => removeQualification(i)}
                  className="mt-7 rounded border border-destructive-300 px-2 py-2 text-xs text-destructive-600 hover:bg-destructive-50"
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
