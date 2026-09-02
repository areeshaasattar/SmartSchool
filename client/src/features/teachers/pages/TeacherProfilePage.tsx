import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface TeacherProfile {
  profile: { firstName: string; lastName: string; dob?: string; gender?: string; photoUrl?: string; phone?: string }
  employment: { designation: string; joiningDate: string; employmentType: string; status: string }
  qualifications: Array<{ degree: string; institution: string; year: number }>
  employeeNo: string
  departments: string[]
  subjects: string[]
  email: string
  attendance: unknown[]
  leave: unknown[]
  workload: unknown[]
  documents: unknown[]
}

export default function TeacherProfilePage() {
  const { id } = useParams()
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .get(`/teachers/${id}/profile`)
      .then((res) => setTeacher(res.data.teacherProfile))
      .catch(() => setError('Failed to load teacher profile'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">Loading teacher profile...</p>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-lg text-center">
        <p className="text-secondary-500">{error || 'Teacher not found'}</p>
        <Link to="/teachers" className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700">
          ← Back to Teachers
        </Link>
      </div>
    )
  }

  const { profile, employment, qualifications } = teacher

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teachers" className="text-secondary-400 hover:text-secondary-600">←</Link>
          <div>
            <h2 className="text-2xl font-bold text-secondary-900">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-sm text-secondary-500">
              {teacher.employeeNo} · {employment.designation} · {employment.status}
            </p>
          </div>
        </div>
        <Link
          to={`/teachers/${id}/edit`}
          className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
        >
          Edit
        </Link>
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
            {profile.dob && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Date of Birth</dt>
                <dd className="text-secondary-900">{new Date(profile.dob).toLocaleDateString()}</dd>
              </div>
            )}
            {profile.gender && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Gender</dt>
                <dd className="capitalize text-secondary-900">{profile.gender}</dd>
              </div>
            )}
            {profile.phone && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Phone</dt>
                <dd className="text-secondary-900">{profile.phone}</dd>
              </div>
            )}
            {teacher.email && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Email</dt>
                <dd className="text-secondary-900">{teacher.email}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Employment */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Employment</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Designation</dt>
              <dd className="font-medium text-secondary-900">{employment.designation}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Joining Date</dt>
              <dd className="text-secondary-900">{new Date(employment.joiningDate).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Type</dt>
              <dd className="capitalize text-secondary-900">{employment.employmentType.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-secondary-500">Status</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    employment.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : employment.status === 'on_leave'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-secondary-100 text-secondary-700'
                  }`}
                >
                  {employment.status}
                </span>
              </dd>
            </div>
            {teacher.departments.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Departments</dt>
                <dd className="text-secondary-900">{teacher.departments.join(', ')}</dd>
              </div>
            )}
            {teacher.subjects.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-secondary-500">Subjects</dt>
                <dd className="text-secondary-900">{teacher.subjects.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Qualifications */}
        <div className="rounded-xl bg-white p-6 shadow-lg lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-secondary-900">Qualifications</h3>
          {qualifications.length === 0 ? (
            <p className="text-sm text-secondary-500">No qualifications listed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-secondary-200">
                  <tr>
                    <th className="pb-2 font-medium text-secondary-700">Degree</th>
                    <th className="pb-2 font-medium text-secondary-700">Institution</th>
                    <th className="pb-2 font-medium text-secondary-700">Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {qualifications.map((q, i) => (
                    <tr key={i}>
                      <td className="py-2 text-secondary-900">{q.degree}</td>
                      <td className="py-2 text-secondary-600">{q.institution}</td>
                      <td className="py-2 text-secondary-600">{q.year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stubbed sections */}
        <SectionStub title="Attendance" icon="📅" items={teacher.attendance} emptyMessage="Attendance tracking will be available after feature/attendance." />
        <SectionStub title="Leave" icon="🏖️" items={teacher.leave} emptyMessage="Leave management will be available after feature/leave-discipline." />
        <SectionStub title="Workload" icon="📊" items={teacher.workload} emptyMessage="Workload data will be available after feature/classes-subjects." />
        <SectionStub title="Documents" icon="📄" items={teacher.documents} emptyMessage="Document management will be available after feature/documents." />
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
