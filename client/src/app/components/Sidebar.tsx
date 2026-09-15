import { BarChart3, BookOpen, Bot, Bus, CalendarDays, GraduationCap, Landmark, LayoutDashboard, Settings, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
const links = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/students', label: 'Students', icon: GraduationCap }, { to: '/teachers', label: 'Teachers', icon: Users }, { to: '/classes', label: 'Classes', icon: BookOpen }, { to: '/attendance/analytics', label: 'Attendance', icon: CalendarDays }, { to: '/fees/invoices', label: 'Finance', icon: Landmark }, { to: '/transport/vehicles', label: 'Transport', icon: Bus }, { to: '/ai', label: 'AI Assistant', icon: Bot }, { to: '/audit/logs', label: 'Audit logs', icon: BarChart3 }]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  return (
    <>
      <Link to="/dashboard" onClick={onNavigate} className="mb-8 flex items-center gap-[10px] px-1">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-teal to-brand-navy text-white">
          <GraduationCap size={16} />
        </span>
        <span className="font-heading text-lg font-bold text-text-heading">Smart<span className="text-brand-lavender-strong">School</span></span>
      </Link>
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Menu</p>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/')
          return (
            <Link key={to} to={to} onClick={onNavigate} className={`flex min-h-[40px] items-center gap-[10px] rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${active ? 'bg-brand-sky text-text-heading' : 'text-text-body hover:bg-secondary-50'}`}>
              <Icon size={20} strokeWidth={1.75} className={active ? 'text-brand-blue-strong' : 'text-text-muted'} />
              {label}
            </Link>
          )
        })}
      </nav>
      <p className="mb-3 mt-8 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Other</p>
      <Link to="/school-settings" onClick={onNavigate} className="flex min-h-[40px] items-center gap-[10px] rounded-xl px-3 py-2.5 text-sm font-medium text-text-body transition-colors duration-150 hover:bg-secondary-50">
        <Settings size={20} strokeWidth={1.75} className="text-text-muted" />Settings
      </Link>
      <div className="card-lift mt-auto rounded-card bg-gradient-to-br from-brand-teal to-brand-navy p-4 text-white">
        <p className="font-heading font-semibold">Need help?</p>
        <p className="mt-1 text-xs leading-relaxed text-white/80">Review the school setup and keep your records current.</p>
        <Link to="/school-settings" onClick={onNavigate} className="mt-3 inline-block rounded-pill bg-white px-3.5 py-1.5 text-xs font-semibold text-text-heading transition-transform hover:scale-[1.02]">
          Open Settings
        </Link>
      </div>
    </>
  )
}

function SidebarRail() {
  const { pathname } = useLocation()
  return (
    <>
      <Link to="/dashboard" className="mb-6 grid h-8 w-8 mx-auto place-items-center rounded-xl bg-gradient-to-br from-brand-teal to-brand-navy text-white" aria-label="SmartSchool home">
        <GraduationCap size={16} />
      </Link>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/')
          return (
            <Link key={to} to={to} title={label} className={`group relative grid min-h-[40px] w-10 mx-auto place-items-center rounded-xl transition-colors duration-150 ${active ? 'bg-brand-sky' : 'hover:bg-secondary-50'}`}>
              <Icon size={20} strokeWidth={1.75} className={active ? 'text-brand-blue-strong' : 'text-text-muted'} />
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-secondary-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-50">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto">
        <Link to="/school-settings" title="Settings" className="grid min-h-[40px] w-10 mx-auto place-items-center rounded-xl hover:bg-secondary-50">
          <Settings size={20} strokeWidth={1.75} className="text-text-muted" />
        </Link>
      </div>
    </>
  )
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop: fixed 220px sidebar (var-tracked) */}
      <aside className="hidden w-[220px] max-lg:w-[var(--sidebar-width)] shrink-0 flex-col border-r border-secondary-100 bg-surface p-4 lg:flex">
        <SidebarContent />
      </aside>
      {/* Tablet (<1024px): icon-only rail with hover tooltips */}
      <aside className="hidden w-[72px] shrink-0 flex-col border-r border-secondary-100 bg-surface py-5 lg:hidden md:flex">
        <SidebarRail />
      </aside>
      {/* Mobile (<768px): off-canvas drawer */}
      <div className="fixed inset-0 z-40 md:hidden">
        <input type="checkbox" id="sidebar-drawer" className="peer sr-only" />
        <label htmlFor="sidebar-drawer" className="absolute inset-0 bg-secondary-900/30 opacity-0 transition-opacity peer-checked:opacity-100" aria-label="Toggle navigation" />
        <aside className="absolute left-0 top-0 flex h-full w-[220px] -translate-x-full flex-col bg-surface p-4 shadow-xl transition-transform duration-200 peer-checked:translate-x-0">
          <SidebarContent onNavigate={() => { const el = document.getElementById('sidebar-drawer') as HTMLInputElement | null; if (el) el.checked = false }} />
        </aside>
      </div>
    </>
  )
}
