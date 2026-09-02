import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import RequireRole from '../../../app/components/RequireRole'

interface ClassItem {
  _id: string
  grade: string
  section: string
  roomId?: { name: string; capacity: number }
  classTeacherId?: { profile: { firstName: string; lastName: string } }
  subjectIds?: { name: string; code: string }[]
}

interface ClassesResponse {
  classes: ClassItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function ClassListPage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [gradeFilter, setGradeFilter] = useState('')
  const activeSchoolId = useSelector((s: RootState) => s.tenant.activeSchoolId)

  const fetchClasses = async () => {
    if (!activeSchoolId) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (gradeFilter) params.set('grade', gradeFilter)
      const res = await api.get(`/classes?${params.toString()}`) as ClassesResponse
      setClasses(res.classes)
      setTotalPages(res.totalPages)
    } catch {
      setError('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [page, gradeFilter, activeSchoolId])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Classes</h1>
        <RequireRole roles={['school_admin', 'principal']}>
          <Link
            to="/classes/new"
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            + New Class
          </Link>
        </RequireRole>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Filter by grade..."
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setPage(1) }}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '200px' }}
        />
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Grade</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Section</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Room</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Class Teacher</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Subjects</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem' }}>{cls.grade}</td>
                <td style={{ padding: '0.75rem' }}>{cls.section}</td>
                <td style={{ padding: '0.75rem' }}>{cls.roomId?.name || '—'}</td>
                <td style={{ padding: '0.75rem' }}>
                  {cls.classTeacherId
                    ? `${cls.classTeacherId.profile.firstName} ${cls.classTeacherId.profile.lastName}`
                    : '—'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  {cls.subjectIds?.map((s) => s.name).join(', ') || '—'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <Link to={`/classes/${cls._id}`} style={{ color: '#3b82f6', marginRight: '0.75rem' }}>
                    View
                  </Link>
                  <RequireRole roles={['school_admin', 'principal']}>
                    <Link to={`/classes/${cls._id}/edit`} style={{ color: '#3b82f6' }}>
                      Edit
                    </Link>
                  </RequireRole>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No classes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
