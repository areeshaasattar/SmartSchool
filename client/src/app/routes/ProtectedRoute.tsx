import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../../store'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

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
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1"><Topbar /><main className="mx-auto max-w-7xl p-5 sm:p-8"><Outlet /></main></div>
    </div>
  )
}
