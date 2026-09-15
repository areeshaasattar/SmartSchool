import { Outlet, Link, useLocation } from 'react-router-dom'

const nav = [
  { path: '/ai/teacher-tools', label: 'Draft history' },
  { path: '/ai/teacher-tools/generate', label: 'Generate quiz' },
]

export default function TeacherToolsLayout() {
  const location = useLocation()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Teacher Assistant</h1>
          <p className="mt-1 text-sm text-secondary-500">AI-generated quiz drafts. Nothing is published automatically.</p>
        </div>
        <div className="flex gap-2">
          {nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                location.pathname === item.path
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  )
}
