import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../../services/api'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
          setError('Failed to load class')
        }
      }
      fetchClass()
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      const msg = err instanceof Error ? err.message : 'Failed to save class'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {isEdit ? 'Edit Class' : 'New Class'}
      </h1>

      {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Grade *</label>
          <input
            type="text"
            required
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            placeholder="e.g. 10"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Section *</label>
          <input
            type="text"
            required
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="e.g. A"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Academic Year *</label>
          <select
            required
            value={form.academicYearId}
            onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">Select academic year</option>
            {academicYears.map((y) => (
              <option key={y._id} value={y._id}>
                {y.label} {y.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Room</label>
          <select
            value={form.roomId}
            onChange={(e) => setForm({ ...form, roomId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">No room</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name} (cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Class Teacher</label>
          <select
            value={form.classTeacherId}
            onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">No class teacher</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.profile.firstName} {t.profile.lastName} ({t.employeeNo})
              </option>
            ))}
          </select>
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
            {loading ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/classes')}
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
