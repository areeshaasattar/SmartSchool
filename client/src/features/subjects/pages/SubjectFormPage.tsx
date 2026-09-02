import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

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
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    name: '',
    code: '',
    gradeMappings: '',
  })

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
          setError('Failed to load subject')
        }
      }
      fetchSubject()
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      const msg = err instanceof Error ? err.message : 'Failed to save subject'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {isEdit ? 'Edit Subject' : 'New Subject'}
      </h1>

      {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Mathematics"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Code *</label>
          <input
            type="text"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g. MATH101"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontFamily: 'monospace' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
            Grade Mappings (comma-separated)
          </label>
          <input
            type="text"
            value={form.gradeMappings}
            onChange={(e) => setForm({ ...form, gradeMappings: e.target.value })}
            placeholder="e.g. 9, 10, 11"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Leave empty if the subject applies to all grades
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Saving...' : isEdit ? 'Update Subject' : 'Create Subject'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/subjects')}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
