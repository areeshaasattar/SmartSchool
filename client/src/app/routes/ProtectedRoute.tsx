import { useSelector } from 'react-redux'
import { Navigate, Outlet, Link } from 'react-router-dom'
import type { RootState } from '../../store'
import NotificationBell from '../../features/notifications/components/NotificationBell'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-secondary-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-secondary-200 sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="text-lg font-bold text-primary-600">SmartSchool</Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
