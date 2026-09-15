import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, GraduationCap, Landmark, Users, MoreHorizontal, ChevronLeft, ChevronRight, FileText, ArrowUpRight, Inbox, CalendarX, FileBarChart } from 'lucide-react'
import EmptyState from '../../../app/components/ui/EmptyState'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../../services/api'
import StatCard from '../../../app/components/ui/StatCard'

interface OverviewData {
  studentCount: number
  teacherCount: number
  attendanceToday: { percentage: number; present: number; total: number }
  feeCollectionRate: number
  totalOutstanding: number
  pendingApprovals: number
}

interface AccountantData {
  invoiceStats: { total: number; paid: number; partiallyPaid: number; pending: number; overdue: number }
  totalInvoiced: number
  totalCollected: number
}

interface LeaveRequest {
  _id: string
  requesterType: 'student' | 'teacher'
  requesterId?: { profile?: { firstName: string; lastName: string } }
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  createdAt: string
}

interface AuditLog {
  _id: string
  actorEmail: string
  action: string
  entity: string
  timestamp: string
}

// ── Calendar (pure date math — no fabricated events) ─────────────────

function CalendarCard({ agenda }: { agenda: LeaveRequest[] }) {
  const today = new Date()
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const monthLabel = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days = useMemo(() => {
    const year = view.getFullYear()
    const month = view.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array.from({ length: firstDow }, () => null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [view])

  const agendaDays = new Set(
    agenda.flatMap((l) => {
      const out: string[] = []
      const start = new Date(l.startDate)
      const end = new Date(l.endDate)
      for (const d of days) {
        if (d && d >= new Date(start.toDateString()) && d <= new Date(end.toDateString())) out.push(d.toDateString())
      }
      return out
    })
  )

  const isToday = (d: Date) => d.toDateString() === today.toDateString()

  return (
    <section className="rounded-card bg-surface p-6 shadow-card">
      {/* 3-column header: prev arrow | centered label | next arrow (equal widths) */}
      <header className="mb-4 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-brand-sky"><ChevronLeft size={16} strokeWidth={1.75} /></button>
        <h2 className="flex-1 text-center font-heading text-lg font-semibold text-text-heading">{monthLabel}</h2>
        <button aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-brand-sky"><ChevronRight size={16} strokeWidth={1.75} /></button>
      </header>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d} className="py-1 text-xs font-medium text-text-muted">{d}</span>)}
        {days.map((d, i) =>
          d ? (
            <span key={i} className={`mx-auto grid h-8 w-8 place-items-center rounded-lg text-sm ${
              isToday(d) ? 'bg-brand-sky font-bold text-brand-blue-strong'
              : agendaDays.has(d.toDateString()) ? 'bg-brand-lavender font-semibold text-text-heading'
              : 'text-text-body'
            }`}>{d.getDate()}</span>
          ) : <span key={i} />
        )}
      </div>
      <div className="mt-5 border-t border-secondary-100 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-heading">Agenda</h3>
          <button aria-label="Agenda options" className="rounded-full p-1 text-text-muted hover:bg-brand-sky"><MoreHorizontal size={16} strokeWidth={1.75} /></button>
        </div>
        {agenda.length === 0 ? (
          <EmptyState icon={CalendarX} message="No upcoming leave scheduled." />
        ) : (
          <ul className="space-y-2">
            {agenda.slice(0, 4).map((l, i) => (
              <li key={l._id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${['bg-brand-lavender', 'bg-brand-yellow', 'bg-brand-blue'][i % 3]}`}>
                <span className="font-heading text-sm font-bold text-text-heading">{new Date(l.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-heading">{l.requesterType === 'teacher' ? 'Staff' : 'Student'} leave · {l.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ── Charts (real data) ───────────────────────────────────────────────

const CHART_COLORS = ['#4FB6E8', '#A9A3F5', '#F4C430', '#EF4444', '#8A8CA5']

function AttendanceDonut({ attendance }: { attendance: { percentage: number; present: number; total: number } }) {
  const absent = Math.max(0, attendance.total - attendance.present)
  const data = [
    { name: 'Present', value: attendance.present },
    { name: 'Absent', value: absent },
  ]
  const hasData = attendance.total > 0
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-text-heading">Today's attendance</h2>
        <button aria-label="Attendance options" className="rounded-full p-1.5 text-text-muted hover:bg-brand-sky"><MoreHorizontal size={18} strokeWidth={1.75} /></button>
      </header>
      {/* Content starts directly below the title — top-anchored, never centered */}
      {hasData ? (
        <>
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={62} outerRadius={84} startAngle={90} endAngle={-270} strokeWidth={0}>
                  <Cell fill="#4FB6E8" />
                  <Cell fill="#EDEEF5" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="font-heading text-3xl font-bold text-text-heading">{attendance.percentage}%</span>
            </div>
          </div>
          <ul className="mt-4 flex justify-center gap-6">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2 text-sm text-text-body">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                {d.name} <span className="font-semibold text-text-heading">{d.value}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={CalendarX}
          message="No attendance marked today."
          action={<Link to="/attendance/mark" className="text-sm font-semibold text-brand-blue-strong hover:underline">Mark Attendance</Link>}
        />
      )}
    </section>
  )
}

function InvoiceBarCard({ stats }: { stats: AccountantData['invoiceStats'] }) {
  const data = [
    { name: 'Paid', count: stats.paid },
    { name: 'Partial', count: stats.partiallyPaid },
    { name: 'Pending', count: stats.pending },
    { name: 'Overdue', count: stats.overdue },
  ].filter((d) => d.count > 0)
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-text-heading">Invoice status</h2>
        <Link to="/fees/invoices" className="flex items-center gap-1 text-sm font-medium text-brand-blue-strong hover:underline">View all <ArrowUpRight size={14} strokeWidth={1.75} /></Link>
      </header>
      {data.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          message="No invoices yet — generate them from Finance."
          action={<Link to="/fees/invoices/generate" className="text-sm font-semibold text-brand-blue-strong hover:underline">Generate Invoices</Link>}
        />
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={28}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8A8CA5', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8A8CA5', fontSize: 12 }} width={28} />
              <Tooltip cursor={{ fill: '#F4F6FB' }} contentStyle={{ borderRadius: 12, border: '1px solid #EDEEF5', boxShadow: '0 4px 20px rgba(20,20,60,0.06)', fontSize: 13 }} />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

// ── Lists ────────────────────────────────────────────────────────────

const statusPill: Record<LeaveRequest['status'], string> = {
  pending: 'bg-brand-yellow text-text-heading',
  approved: 'bg-success-soft text-success',
  rejected: 'bg-destructive-50 text-destructive-600',
  cancelled: 'bg-secondary-100 text-secondary-600',
}

function LeaveListCard({ requests }: { requests: LeaveRequest[] }) {
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-text-heading">Latest leave requests</h2>
        <Link to="/leave" className="text-sm font-medium text-brand-blue-strong hover:underline">View all</Link>
      </header>
      {requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          message="No leave requests yet."
          action={<Link to="/leave/new" className="text-sm font-semibold text-brand-blue-strong hover:underline">Create leave request</Link>}
        />
      ) : (
        <ul className="divide-y divide-secondary-100">
          {requests.slice(0, 5).map((l) => (
            <li key={l._id} className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-lavender text-brand-lavender-strong">
                <FileText size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-heading">{l.reason}</p>
                <p className="text-xs text-text-muted">
                  {l.requesterType === 'teacher' ? 'Staff' : 'Student'} · {new Date(l.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} – {new Date(l.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold capitalize ${statusPill[l.status]}`}>{l.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AuditListCard() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  useEffect(() => {
    api.get('/audit/logs', { params: { limit: 5, page: 1 } }).then((res) => setLogs(res.data.logs ?? [])).catch(() => {})
  }, [])
  return (
    <section className="flex h-full flex-col rounded-card bg-surface p-6 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-text-heading">Recent activity</h2>
        <Link to="/audit/logs" className="text-sm font-medium text-brand-blue-strong hover:underline">View all</Link>
      </header>
      {logs.length === 0 ? (
        <EmptyState icon={Inbox} message="No recorded activity yet." />
      ) : (
        <ul className="divide-y divide-secondary-100">
          {logs.map((log) => (
            <li key={log._id} className="py-3">
              <p className="truncate text-sm text-text-body"><span className="font-medium text-text-heading">{log.actorEmail}</span> <span className="capitalize">{log.action.replaceAll('_', ' ')}</span> {log.entity}</p>
              <p className="mt-0.5 text-xs text-text-muted">{new Date(log.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────

export default function SchoolAdminDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [invoiceStats, setInvoiceStats] = useState<AccountantData['invoiceStats'] | null>(null)
  const [leave, setLeave] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/analytics/school-admin/overview'),
      api.get('/analytics/accountant/overview'),
      api.get('/leave', { params: { limit: 8, page: 1 } }),
    ]).then(([overview, accountant, leaveRes]) => {
      if (overview.status === 'fulfilled') setData(overview.value.data)
      if (accountant.status === 'fulfilled') setInvoiceStats(accountant.value.data.invoiceStats ?? null)
      if (leaveRes.status === 'fulfilled') setLeave(leaveRes.value.data.requests ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-8 text-center text-secondary-500">Loading dashboard...</div>
  if (!data) return <div className="py-8 text-center text-secondary-400">Failed to load dashboard</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-muted">Overview</p>
        <h1 className="font-heading text-3xl font-bold">School dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-6">
          {/* KPI row — one shared StatCard template, mandatory pill row on all four */}
          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/students" className="card-lift block rounded-card"><StatCard label="Students" value={data.studentCount} tone="purple" icon={<GraduationCap size={18} strokeWidth={1.75} />} /></Link>
            <Link to="/teachers" className="card-lift block rounded-card"><StatCard label="Teachers" value={data.teacherCount} tone="yellow" icon={<Users size={18} strokeWidth={1.75} />} /></Link>
            <Link to="/attendance/analytics" className="card-lift block rounded-card"><StatCard label="Today's attendance" value={`${data.attendanceToday.percentage}%`} tone="blue" icon={<CalendarDays size={18} strokeWidth={1.75} />} trend={`${data.attendanceToday.present}/${data.attendanceToday.total} present`} /></Link>
            <Link to="/fees/collection" className="card-lift block rounded-card"><StatCard label="Fee collection" value={`${data.feeCollectionRate}%`} tone="purple" icon={<Landmark size={18} strokeWidth={1.75} />} trend={`$${data.totalOutstanding.toLocaleString()} outstanding`} /></Link>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AttendanceDonut attendance={data.attendanceToday} />
            {invoiceStats ? <InvoiceBarCard stats={invoiceStats} /> : (
              <section className="rounded-card bg-surface p-6 shadow-card">
                <h2 className="font-heading text-lg font-semibold text-text-heading">Invoice status</h2>
                <EmptyState icon={FileBarChart} message="Invoice data unavailable." />
              </section>
            )}
          </div>

          {/* Lists row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LeaveListCard requests={leave} />
            <AuditListCard />
          </div>

          {/* Quick actions */}
          <section className="rounded-card bg-brand-lavender p-6">
            <h2 className="font-heading text-lg font-semibold text-text-heading">Quick actions</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/students/new" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-heading shadow-card transition-transform hover:scale-[1.02]">+ Add Student</Link>
              <Link to="/teachers/new" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-heading shadow-card transition-transform hover:scale-[1.02]">+ Add Teacher</Link>
              <Link to="/fees/invoices/generate" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-heading shadow-card transition-transform hover:scale-[1.02]">Generate Invoices</Link>
              <Link to="/leave" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-text-heading shadow-card transition-transform hover:scale-[1.02]">Review Leave Requests</Link>
            </div>
          </section>
        </div>

        {/* Right column: calendar + agenda */}
        <CalendarCard agenda={leave.filter((l) => l.status !== 'rejected' && l.status !== 'cancelled' && new Date(l.endDate) >= new Date())} />
      </div>
    </div>
  )
}
