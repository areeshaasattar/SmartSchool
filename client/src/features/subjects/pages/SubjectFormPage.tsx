import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import FormField from '../../../app/components/ui/FormField'
import { extractServerError, focusFirstError, type FieldErrors } from '../../../app/lib/formValidation'

interface FormData {
  name: string
  code: string
  gradeMappings: string // comma-separated grades
}

export default function SubjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [form, setForm] = useState<FormData>({
    name: '',
    code: '',
    gradeMappings: '',
  })

  // ── Validation (mirror of createSubjectSchema) ─────────────────────

  const validateField = (fieldId: string): string | undefined => {
    switch (fieldId) {
      case 'name':
        return form.name.trim() ? undefined : 'Subject name is required'
      case 'code':
        return form.code.trim() ? undefined : 'Subject code is required'
      default:
        return undefined
    }
  }

  const FIELD_IDS = ['name', 'code']

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
    if (isEdit && id) {
      const fetchSubject = async () => {
        try {
          const sub = await api.get(`/subjects/${id}`) as unknown as FormData & { _id: string; gradeMappings: { grade: string }[] }
          setForm({
            name: sub.name || '',
            code: sub.code || '',
            gradeMappings: sub.gradeMappings?.map((g) => g.grade).join(', ') || '',
          })
        } catch {
          setBanner('Failed to load subject')
        }
      }
      fetchSubject()
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

    setLoading(true)

    try {
      const gradeMappings = form.gradeMappings
        ? form.gradeMappings.split(',').map((g) => ({ grade: g.trim() })).filter((g) => g.grade)
        : []

      const payload = {
        name: form.name,
        code: form.code,
        gradeMappings,
      }

      if (isEdit) {
        await api.patch(`/subjects/${id}`, payload)
      } else {
        await api.post('/subjects', payload)
      }
      navigate('/subjects')
    } catch (err: unknown) {
      const { banner: serverBanner, fieldErrors: serverFieldErrors } = extractServerError(err, 'Failed to save subject')
      setBanner(serverBanner)
      setFieldErrors(serverFieldErrors)
      if (Object.keys(serverFieldErrors).length > 0) focusFirstError(serverFieldErrors)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-2">
      <h1 className="text-2xl font-bold text-secondary-900">
        {isEdit ? 'Edit Subject' : 'New Subject'}
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
        <FormField id="name" label="Name" required error={fieldErrors['name']} value={form.name} onChange={(v) => { setForm({ ...form, name: v }); clearFieldError('name') }} onBlur={() => handleBlur('name')} placeholder="e.g. Mathematics" />

        <FormField id="code" label="Code" required error={fieldErrors['code']} value={form.code} onChange={(v) => { setForm({ ...form, code: v }); clearFieldError('code') }} onBlur={() => handleBlur('code')} placeholder="e.g. MATH101" />

        <FormField id="gradeMappings" label="Grade Mappings (comma-separated)" value={form.gradeMappings} onChange={(v) => setForm({ ...form, gradeMappings: v })} placeholder="e.g. 9, 10, 11">
          <input
            id="gradeMappings"
            type="text"
            value={form.gradeMappings}
            onChange={(e) => setForm({ ...form, gradeMappings: e.target.value })}
            placeholder="e.g. 9, 10, 11"
            className="w-full rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </FormField>
        <p className="-mt-2 text-xs text-text-muted">Leave empty if the subject applies to all grades</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/subjects')}
            className="rounded-lg border border-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Subject' : 'Create Subject'}
          </button>
        </div>
      </form>
    </div>
  )
}
