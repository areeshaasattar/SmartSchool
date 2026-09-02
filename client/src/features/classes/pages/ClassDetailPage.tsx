import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'
import RequireRole from '../../../app/components/RequireRole'

interface Student {
  _id: string
  admissionNo: string
  profile: { firstName: string; lastName: string; gender: string }
}

interface ClassDetail {
  _id: string
  grade: string
  section: string
  roomId?: { name: string; capacity: number }
  classTeacherId?: { profile: { firstName: string; lastName: string } }
  subjectIds?: { _id: string; name: string; code: string }[]
  teacherIds?: { _id: string; profile: { firstName: string; lastName: string } }[]
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrollStudentId, setEnrollStudentId] = useState('')


  const fetchClass = async () => {
    if (!id) return
    setLoading(true)
    try {
      const classData = await api.get(`/classes/${id}`) as ClassDetail
      setCls(classData)

      const roster = await api.get(`/classes/${id}/roster`) as { students: Student[] }
      setStudents(roster.students)
    } catch {
      setError('Failed to load class details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClass()
  }, [id])

  const handleEnroll = async () => {
    if (!enrollStudentId || !id) return
    try {
      await api.post(`/classes/${id}/enroll`, { studentId: enrollStudentId })
      setEnrollStudentId('')
      fetchClass()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to enroll student')
    }
  }

  const handleUnenroll = async (studentId: string) => {
    if (!id) return
    try {
      await api.post(`/classes/${id}/unenroll`, { studentId })
      fetchClass()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unenroll student')
    }
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (error) return <p style={{ padding: '2rem', color: '#ef4444' }}>{error}</p>
  if (!cls) return <p style={{ padding: '2rem' }}>Class not found</p>

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          Class {cls.grade} - {cls.section}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <RequireRole roles={['school_admin', 'principal']}>
            <Link
              to={`/classes/${id}/edit`}
              style={{
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Edit Class
            </Link>
          </RequireRole>
        </div>
      </div>

      {/* Class Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Room</p>
          <p>{cls.roomId?.name || 'Not assigned'}</p>
        </div>
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Class Teacher</p>
          <p>
            {cls.classTeacherId
              ? `${cls.classTeacherId.profile.firstName} ${cls.classTeacherId.profile.lastName}`
              : 'Not assigned'}
          </p>
        </div>
        <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>Subjects</p>
          <p>{cls.subjectIds?.map((s) => s.name).join(', ') || 'None assigned'}</p>
        </div>
      </div>

      {/* Assigned Teachers */}
      {cls.teacherIds && cls.teacherIds.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assigned Teachers</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {cls.teacherIds.map((t) => (
              <span
                key={t._id}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#e0e7ff',
                  borderRadius: '999px',
                  fontSize: '0.875rem',
                }}
              >
                {t.profile.firstName} {t.profile.lastName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subject-Teacher Assignment */}
      <RequireRole roles={['school_admin', 'principal']}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Subject-Teacher Assignment</h2>
          <Link
            to={`/classes/${id}/assign-subject`}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-block',
            }}
          >
            Assign Subject + Teacher
          </Link>
        </div>
      </RequireRole>

      {/* Roster */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Roster ({students.length} students)
        </h2>

        {/* Enroll form */}
        <RequireRole roles={['school_admin', 'principal']}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="Student ID to enroll"
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', flex: 1 }}
            />
            <button
              onClick={handleEnroll}
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Enroll
            </button>
          </div>
        </RequireRole>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Admission No</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Gender</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '0.75rem' }}>{s.admissionNo}</td>
                <td style={{ padding: '0.75rem' }}>
                  {s.profile.firstName} {s.profile.lastName}
                </td>
                <td style={{ padding: '0.75rem' }}>{s.profile.gender}</td>
                <td style={{ padding: '0.75rem' }}>
                  <Link to={`/students/${s._id}`} style={{ color: '#3b82f6', marginRight: '0.75rem' }}>
                    View
                  </Link>
                  <RequireRole roles={['school_admin', 'principal']}>
                    <button
                      onClick={() => handleUnenroll(s._id)}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Unenroll
                    </button>
                  </RequireRole>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No students enrolled
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
