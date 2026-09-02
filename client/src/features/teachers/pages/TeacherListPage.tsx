import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface Teacher {
  id: string
  employeeNo: string
  profile: { firstName: string; lastName: string; gender?: string }
  employment: { designation: string; status: string; employmentType: string }
  departments: string[]
  email: string
  createdAt: string
}

interface PaginatedResponse {
  teachers: Teacher[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function TeacherListPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const canCreate = user?.roles.some((r) => ['super_admin', 'school_admin', 'principal', 'hr'].includes(r))

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadTeachers = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter) params.set('status', statusFilter)

    api
      .get(`/teachers?${params}`)
      .then((res) => {
        const data: PaginatedResponse = res.data
        setTeachers(data.teachers)
        setTotalPages(data.pagination.totalPages)
      })
      .catch(() => setError('Failed to load teachers'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    loadTeachers()
  }, [loadTeachers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Teachers</h2>
        {canCreate && (
          <Link
            to="/teachers/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Add Teacher
          </Link>
        )}
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name or employee no..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-secondary-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      <div className="rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : teachers.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">No teachers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondary-700">Employee No</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Designation</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Departments</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-mono text-secondary-600">{t.employeeNo}</td>
                    <td className="px-4 py-3 font-medium text-secondary-900">
                      {t.profile.firstName} {t.profile.lastName}
                    </td>
                    <td className="px-4 py-3 text-secondary-600">{t.employment.designation}</td>
                    <td className="px-4 py-3 text-secondary-600">
                      {t.departments.length > 0 ? t.departments.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.employment.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : t.employment.status === 'on_leave'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-secondary-100 text-secondary-700'
                        }`}
                      >
                        {t.employment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/teachers/${t.id}`}
                          className="rounded border border-secondary-300 px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                        >
                          View
                        </Link>
                        <Link
                          to={`/teachers/${t.id}/profile`}
                          className="rounded border border-primary-300 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                        >
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-secondary-200 px-4 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-secondary-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
