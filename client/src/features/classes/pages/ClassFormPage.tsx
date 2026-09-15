import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import FormField from '../../../app/components/ui/FormField'
import { extractServerError, focusFirstError, type FieldErrors } from '../../../app/lib/formValidation'

interface FormData {
  grade: string
  section: string
  roomId: string
  academicYearId: string
  classTeacherId: string
}

interface AcademicYear {
  _id: string
  label: string
  isCurrent: boolean
}

interface Teacher {
  _id: string
  employeeNo: string
  profile: { firstName: string; lastName: string }
}

interface Room {
  _id: string
  name: string
  capacity: number
}

export default function ClassFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  const [form, setForm] = useState<FormData>({
    grade: '',
    section: '',
    roomId: '',
    academicYearId: '',
    classTeacherId: '',
  })

  // ── Validation (mirror of createClassSchema) ───────────────────────

  const validateField = (fieldId: string): string | undefined => {
    switch (fieldId) {
      case 'grade':
        return form.grade.trim() ? undefined : 'Grade is required'
      case 'section':
        return form.section.trim() ? undefined : 'Section is required'
      case 'academicYearId':
        return form.academicYearId ? undefined : 'Academic year is required'
      default:
        return undefined
    }
  }

  const FIELD_IDS = ['grade', 'section', 'academicYearId']

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [yearsRes, teachersRes, roomsRes] = await Promise.all([
          api.get('/schools/current/academic-years') as Promise<{ academicYears: AcademicYear[] }>,
          api.get('/teachers') as Promise<{ teachers: Teacher[] }>,
          api.get('/classes/rooms') as Promise<Room[]>,
        ])
        setAcademicYears(yearsRes.academicYears || [])
        setTeachers(teachersRes.teachers || [])
        setRooms(roomsRes as unknown as Room[])

        // Auto-select current year
        const current = yearsRes.academicYears?.find((y) => y.isCurrent)
        if (current) setForm((f) => ({ ...f, academicYearId: current._id }))
      } catch {
        // Non-critical — form will work without dropdowns
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      const fetchClass = async () => {
        try {
          const cls = await api.get(`/classes/${id}`) as unknown as FormData & { _id: string }
          setForm({
            grade: cls.grade || '',
            section: cls.section || '',
            roomId: (cls.roomId as unknown as string) || '',
            academicYearId: (cls.academicYearId as unknown as string) || '',
            classTeacherId: (cls.classTeacherId as unknown as string) || '',
          })
        } catch {
          setBanner('Failed to load class')
        }
      }
      fetchClass()
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      const payload = {
        ...form,
        roomId: form.roomId || undefined,
        classTeacherId: form.classTeacherId || undefined,
      }

      if (isEdit) {
        await api.patch(`/classes/${id}`, payload)
      } else {
        await api.post('/classes', payload)
      }
      navigate('/classes')
    } catch (err: unknown) {
      const { banner: serverBanner, fieldErrors: serverFieldErrors } = extractServerError(err, 'Failed to save class')
      setBanner(serverBanner)
      setFieldErrors(serverFieldErrors)
      if (Object.keys(serverFieldErrors).length > 0) focusFirstError(serverFieldErrors)
    } finally {
      setSaving(false)
    }
  }

  const selectClass = (error?: string) =>
    `w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
      error
        ? 'border-destructive-500 bg-[#fdeaea] focus:border-destructive-500 focus:ring-destructive-500'
        : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500'
    }`

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-2">
      <h1 className="text-2xl font-bold text-secondary-900">
        {isEdit ? 'Edit Class' : 'New Class'}
      </h1>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="grade" label="Grade" required error={fieldErrors['grade']} value={form.grade} onChange={(v) => { setForm({ ...form, grade: v }); clearFieldError('grade') }} onBlur={() => handleBlur('grade')} placeholder="e.g. 10" />

        <FormField id="section" label="Section" required error={fieldErrors['section']} value={form.section} onChange={(v) => { setForm({ ...form, section: v }); clearFieldError('section') }} onBlur={() => handleBlur('section')} placeholder="e.g. A" />

        <div>
          <label htmlFor="academicYearId" className="mb-1 block text-sm font-medium text-secondary-700">
            Academic Year <span className="text-destructive-500">*</span>
          </label>
          <select
            id="academicYearId"
            value={form.academicYearId}
            onChange={(e) => { setForm({ ...form, academicYearId: e.target.value }); clearFieldError('academicYearId') }}
            onBlur={() => handleBlur('academicYearId')}
            className={selectClass(fieldErrors['academicYearId'])}
          >
            <option value="">Select academic year</option>
            {academicYears.map((y) => (
              <option key={y._id} value={y._id}>
                {y.label} {y.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
          {fieldErrors['academicYearId'] && <p className="field-error-text">{fieldErrors['academicYearId']}</p>}
        </div>

        <div>
          <label htmlFor="roomId" className="mb-1 block text-sm font-medium text-secondary-700">Room</label>
          <select
            id="roomId"
            value={form.roomId}
            onChange={(e) => setForm({ ...form, roomId: e.target.value })}
            className={selectClass()}
          >
            <option value="">Select room (optional)</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>{r.name} ({r.capacity})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="classTeacherId" className="mb-1 block text-sm font-medium text-secondary-700">Class Teacher</label>
          <select
            id="classTeacherId"
            value={form.classTeacherId}
            onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
            className={selectClass()}
          >
            <option value="">Select teacher (optional)</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>{t.profile.firstName} {t.profile.lastName}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class'}
          </button>
        </div>
      </form>
    </div>
  )
}
