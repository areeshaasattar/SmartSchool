import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'
import ImportExportControls from '../../import-export/components/ImportExportControls'

interface Student {
  id: string
  admissionNo: string
  profile: { firstName: string; lastName: string; gender: string }
  status: string
  createdAt: string
}

interface PaginatedResponse {
  students: Student[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function StudentListPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const canCreate = user?.roles.some((r) => ['super_admin', 'school_admin', 'principal'].includes(r))

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadStudents = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (statusFilter) params.set('status', statusFilter)

    api
      .get(`/students?${params}`)
      .then((res) => {
        const data: PaginatedResponse = res.data
        setStudents(data.students)
        setTotalPages(data.pagination.totalPages)
      })
      .catch(() => setError('Failed to load students'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, statusFilter])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-secondary-900">Students</h2>
        {canCreate && <div className="flex flex-wrap items-center gap-2"><ImportExportControls entity="students" onImported={loadStudents} />
          <Link
            to="/students/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + Add Student
          </Link>
        </div>}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name or admission no..."
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
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondary-700">Admission No</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Gender</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Created</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-mono text-secondary-600">{s.admissionNo}</td>
                    <td className="px-4 py-3 font-medium text-secondary-900">
                      {s.profile.firstName} {s.profile.lastName}
                    </td>
                    <td className="px-4 py-3 capitalize text-secondary-600">{s.profile.gender}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : s.status === 'graduated'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-secondary-100 text-secondary-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/students/${s.id}`}
                          className="rounded border border-secondary-300 px-2 py-1 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                        >
                          View
                        </Link>
                        <Link
                          to={`/students/${s.id}/360`}
                          className="rounded border border-primary-300 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                        >
                          360°
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
