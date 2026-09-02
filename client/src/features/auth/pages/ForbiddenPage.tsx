import { Link } from 'react-router-dom'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-4 text-6xl">🚫</div>
          <h1 className="text-2xl font-bold text-secondary-900">403 — Forbidden</h1>
          <p className="mt-2 text-sm text-secondary-500">
            You don't have permission to access this page.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
