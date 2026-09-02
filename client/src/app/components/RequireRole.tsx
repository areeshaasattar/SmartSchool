import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../../store'

interface RequireRoleProps {
  roles: string[]
  children?: React.ReactNode
}

/**
 * Wrapper component that checks if the authenticated user holds
 * at least one of the required roles. Renders a 403 page or
 * redirects if the check fails.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth)

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  const hasRole = user.roles.some((role) => roles.includes(role))

  if (!hasRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-6xl">🚫</div>
            <h1 className="text-2xl font-bold text-secondary-900">Access Denied</h1>
            <p className="mt-2 text-sm text-secondary-500">
              You don't have the required permissions to view this page.
            </p>
            <p className="mt-4 text-xs text-secondary-400">
              Required roles: {roles.join(', ')}
            </p>
            <p className="text-xs text-secondary-400">
              Your roles: {user.roles.join(', ')}
            </p>
            <a
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
