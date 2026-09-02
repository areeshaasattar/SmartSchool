import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState } from '../../../store'
import { clearUser } from '../../../store'
import SchoolSwitcher from '../../../app/components/SchoolSwitcher'

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(clearUser())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <nav className="border-b border-secondary-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-primary-600">SmartSchool</h1>
          <div className="flex items-center gap-4">
            <SchoolSwitcher />
            <span className="text-sm text-secondary-600">
              {user?.profile.firstName} {user?.profile.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-secondary-900">Dashboard</h2>
          <p className="mt-2 text-secondary-500">
            Welcome to SmartSchool! This is a placeholder dashboard.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-secondary-200 p-4">
              <h3 className="font-medium text-secondary-900">Email</h3>
              <p className="text-sm text-secondary-500">{user?.email}</p>
            </div>
            <div className="rounded-lg border border-secondary-200 p-4">
              <h3 className="font-medium text-secondary-900">Roles</h3>
              <p className="text-sm text-secondary-500">{user?.roles.join(', ')}</p>
            </div>
            <div className="rounded-lg border border-secondary-200 p-4">
              <h3 className="font-medium text-secondary-900">Status</h3>
              <p className="text-sm text-secondary-500">{user?.status}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
