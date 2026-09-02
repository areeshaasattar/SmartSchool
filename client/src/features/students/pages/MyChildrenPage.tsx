import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface Child {
  id: string
  admissionNo: string
  profile: { firstName: string; lastName: string; gender: string }
  status: string
}

export default function MyChildrenPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    api
      .get(`/guardians/${user.id}/children`)
      .then((res) => setChildren(res.data.children))
      .catch(() => setError('Failed to load children'))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">My Children</h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}

      <div className="rounded-xl bg-white shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-secondary-500">Loading...</div>
        ) : children.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">No children linked to your account.</div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {children.map((child) => (
              <div key={child.id} className="flex items-center justify-between p-4 hover:bg-secondary-50">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {child.profile.firstName[0]}{child.profile.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">
                      {child.profile.firstName} {child.profile.lastName}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {child.admissionNo} · {child.status}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/students/${child.id}`}
                    className="rounded border border-secondary-300 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/students/${child.id}/360`}
                    className="rounded bg-primary-50 border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  >
                    360° View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
