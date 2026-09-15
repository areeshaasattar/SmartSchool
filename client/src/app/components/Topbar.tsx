import { Bell, Menu, MessageCircle, Search } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../store'
import Avatar from './ui/Avatar'

export default function Topbar() {
  const user = useSelector((state: RootState) => state.auth.user)
  const name = user ? `${user.profile.firstName} ${user.profile.lastName}` : 'User'
  const role = user?.roles[0]?.replace('_', ' ') ?? ''
  return (
    <header className="flex h-[72px] items-center justify-between gap-4 bg-surface px-5 sm:px-8">
      <label htmlFor="sidebar-drawer" className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl hover:bg-secondary-50 lg:hidden" aria-label="Open navigation">
        <Menu size={20} strokeWidth={1.75} />
      </label>
      <div className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-background px-4 py-2.5 sm:flex">
        <Search size={18} strokeWidth={1.75} className="text-text-muted" />
        <input className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted" placeholder="Search students, teachers..." />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link to="/messages" aria-label="Messages" className="grid h-10 w-10 place-items-center rounded-full bg-surface text-text-body shadow-card transition-colors hover:bg-brand-sky">
          <MessageCircle size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-surface text-text-body shadow-card transition-colors hover:bg-brand-sky">
          <Bell size={18} strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-3 border-l border-secondary-100 pl-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-text-heading">{name}</p>
            <p className="text-xs capitalize text-text-muted">{role}</p>
          </div>
          <Avatar name={name} online />
        </div>
      </div>
    </header>
  )
}
