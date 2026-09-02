import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import RequireRole from '../../../app/components/RequireRole'

interface Subject {
  _id: string
  name: string
  code: string
  gradeMappings: { grade: string }[]
}

export default function SubjectListPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSubjects = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/subjects') as Subject[]
      setSubjects(data)
    } catch {
      setError('Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Subjects</h1>
        <RequireRole roles={['school_admin', 'principal']}>
          <Link
            to="/subjects/new"
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            + New Subject
          </Link>
        </RequireRole>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Code</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Grades</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub) => (
              <tr key={sub._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem' }}>{sub.name}</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{sub.code}</td>
                <td style={{ padding: '0.75rem' }}>
                  {sub.gradeMappings?.length
                    ? sub.gradeMappings.map((g) => g.grade).join(', ')
                    : 'All grades'}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <RequireRole roles={['school_admin', 'principal']}>
                    <Link to={`/subjects/${sub._id}/edit`} style={{ color: '#3b82f6' }}>
                      Edit
                    </Link>
                  </RequireRole>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No subjects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
