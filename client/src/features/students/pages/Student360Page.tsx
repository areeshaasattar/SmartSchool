import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Student360 {
  profile: { firstName: string; lastName: string; dob: string; gender: string; bloodGroup?: string; photoUrl?: string }
  emergencyContact: { name: string; relation: string; phone: string }
  admissionNo: string
  status: string
  guardians: Array<{ _id: string; relationship: string; userId: { profile: { firstName: string; lastName: string } } }>
  attendance: unknown[]
  grades: unknown[]
  fees: unknown
  documents: unknown[]
  behavior: unknown[]
}

export default function Student360Page() {
  const { id } = useParams()
  const [student, setStudent] = useState<Student360 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .get(`/students/${id}/360`)
      .then((res) => setStudent(res.data.student360))
      .catch(() => setError('Failed to load student profile'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading student profile...</p>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">{error || 'Student not found'}</p>
        <Link to="/students" className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700">
          ← Back to Students
        </Link>
      </div>
    )
  }

  const { profile, emergencyContact, guardians, attendance, grades, fees, documents, behavior } = student

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/students" className="text-secondary-400 hover:text-secondary-600">←</Link>
          <div>
            <h2 className="text-2xl font-bold text-secondary-900">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-sm text-secondary-500">
              {student.admissionNo} · {student.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2"><Link to={`/audit/history?entity=student&entityId=${id}`} className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50">View history</Link><Link to={`/students/${id}/edit`} className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50">Edit</Link></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Profile</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Full Name</dt>
              <dd className="text-sm font-medium text-secondary-900">{profile.firstName} {profile.lastName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Date of Birth</dt>
              <dd className="text-sm text-secondary-900">
                {profile.dob ? new Date(profile.dob).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Gender</dt>
              <dd className="capitalize text-secondary-900">{profile.gender}</dd>
            </div>
            {profile.bloodGroup && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Blood Group</dt>
                <dd className="text-secondary-900">{profile.bloodGroup}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Emergency Contact</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Name</dt>
              <dd className="text-sm font-medium text-secondary-900">{emergencyContact.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Relation</dt>
              <dd className="text-secondary-900">{emergencyContact.relation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Phone</dt>
              <dd className="text-secondary-900">{emergencyContact.phone}</dd>
            </div>
          </dl>
        </div>

        {/* Guardians */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Guardians</h3>
          {guardians.length === 0 ? (
            <p className="text-sm text-secondary-500">No guardians linked.</p>
          ) : (
            <div className="space-y-3">
              {guardians.map((g) => (
                <div key={g._id} className="flex items-center justify-between rounded-lg border border-secondary-200 p-3">
                  <div>
                    <p className="font-medium text-secondary-900">
                      {g.userId?.profile?.firstName} {g.userId?.profile?.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{g.relationship}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance (stub) */}
        <SectionStub title="Attendance" icon="📅" items={attendance} emptyMessage="Attendance tracking will be available after feature/attendance is implemented." />

        {/* Grades (stub) */}
        <SectionStub title="Grades" icon="📝" items={grades} emptyMessage="Grade records will be available after feature/exams is implemented." />

        {/* Fees (stub) */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-secondary-900">
            <span>💰</span> Fees
          </h3>
          {fees ? (
            <pre className="text-sm text-secondary-600">{JSON.stringify(fees, null, 2)}</pre>
          ) : (
            <p className="text-sm text-secondary-500 italic">
              Fee records will be available after feature/finance is implemented.
            </p>
          )}
        </div>

        {/* Documents (stub) */}
        <SectionStub title="Documents" icon="📄" items={documents} emptyMessage="Document management will be available after feature/documents is implemented." />

        {/* Behavior (stub) */}
        <SectionStub title="Behavior" icon="🌟" items={behavior} emptyMessage="Behavior records will be available after feature/discipline is implemented." />
      </div>
    </div>
  )
}

function SectionStub({ title, icon, items, emptyMessage }: { title: string; icon: string; items: unknown[]; emptyMessage: string }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-secondary-900">
        <span>{icon}</span> {title}
      </h3>
      {items.length > 0 ? (
        <pre className="text-sm text-secondary-600">{JSON.stringify(items, null, 2)}</pre>
      ) : (
        <p className="text-sm text-secondary-500 italic">{emptyMessage}</p>
      )}
    </div>
  )
}
