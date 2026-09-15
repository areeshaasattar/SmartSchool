import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useListDraftsQuery, type DraftStatus } from '../api/teacherToolsApi'
import type { RootState } from '../../../../store'
import { ROLE_GUARDS_ENABLED } from '../../../../app/accessControl'

export default function DraftHistoryPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [status, setStatus] = useState<DraftStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const { data, isLoading, error } = useListDraftsQuery(
    status === 'all' ? { page, limit } : { status, page, limit },
    { skip: !user },
  )

  // Role guard bypassed in development (see app/accessControl.ts)
  if (ROLE_GUARDS_ENABLED && (!user || (!user.roles.includes('teacher') && !user.roles.includes('school_admin')))) {
    return <div className="rounded-xl bg-white p-6 text-secondary-600 shadow-sm">Access denied.</div>
  }

  if (isLoading) return <div className="mx-auto max-w-3xl p-10 text-center text-secondary-500">Loading drafts…</div>
  if (error) return <div className="mx-auto max-w-3xl p-10 text-center text-red-600">Failed to load drafts.</div>

  const drafts = data?.drafts ?? []
  const totalPages = data?.totalPages ?? 1

  const statusBadge = (status: DraftStatus) => {
    const map: Record<DraftStatus, string> = {
      generated: 'bg-blue-100 text-blue-700',
      edited: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      discarded: 'bg-secondary-100 text-secondary-700',
    }
    return map[status]
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">AI Draft History</h1>
        <p className="mt-1 text-sm text-secondary-500">
          Review your AI-generated quiz drafts. Approved drafts become real assignments; discarded drafts are retained for audit.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as DraftStatus | 'all')
            setPage(1)
          }}
          className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="generated">Generated</option>
          <option value="edited">Edited</option>
          <option value="approved">Approved</option>
          <option value="discarded">Discarded</option>
        </select>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm p-10 text-center text-secondary-500">
          No drafts found.
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div key={draft._id} className="rounded-xl bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-secondary-900">{draft.requestParams.topic}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(draft.status)}`}>
                      {draft.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-secondary-600">
                    Class: {draft.classId?.grade} {draft.classId?.section} · Subject: {draft.subjectId?.name}
                  </p>
                  <p className="mt-1 text-sm text-secondary-600">
                    Difficulty: {draft.requestParams.difficulty} · Questions: {draft.requestParams.questionCount}
                  </p>
                </div>
                <div className="flex gap-2">
                  {draft.status === 'approved' && draft.publishedAssignmentId && (
                    <Link
                      to={`/assignments/${draft.publishedAssignmentId}`}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      View assignment
                    </Link>
                  )}
                  {(draft.status === 'generated' || draft.status === 'edited') && (
                    <Link
                      to={`/ai/teacher-tools/drafts/${draft._id}/review`}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    >
                      Review & edit
                    </Link>
                  )}
                  {(draft.status === 'generated' || draft.status === 'edited' || draft.status === 'approved') && (
                    <Link
                      to={`/ai/teacher-tools/drafts/${draft._id}/review`}
                      className="rounded-lg border border-secondary-300 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-50"
                    >
                      {draft.status === 'approved' ? 'View' : 'Details'}
                    </Link>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-secondary-500">
                Created {new Date(draft.createdAt).toLocaleString()}
                {draft.reviewedAt ? ` · Reviewed ${new Date(draft.reviewedAt).toLocaleString()}` : ''}
                {draft.publishedAssignmentId ? ' · Published assignment ID: ' + draft.publishedAssignmentId : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-secondary-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
