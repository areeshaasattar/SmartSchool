import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'

/**
 * Single shared KPI card template. The trend pill row is MANDATORY on every
 * instance — when no trend data exists, a neutral placeholder pill renders so
 * every card in a row has identical vertical rhythm:
 *   header row → 16px gap → number → 12px gap → pill row
 */
export default function StatCard({ label, value, icon, tone = 'blue', trend, trendDirection = 'up' }: { label: string; value: ReactNode; icon?: ReactNode; tone?: 'blue' | 'purple' | 'yellow'; trend?: string; trendDirection?: 'up' | 'down' }) {
  const colors = { blue: 'bg-brand-blue', purple: 'bg-brand-lavender', yellow: 'bg-brand-yellow' }
  return (
    <div className={`flex h-full flex-col rounded-card p-6 ${colors[tone]}`}>
      {/* Header row: label left, icon chip right */}
      <div className="flex w-full items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-heading/80">{label}</p>
        {icon && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-black/5 text-text-heading/70">
            {icon}
          </span>
        )}
      </div>
      {/* Big number — 16px below header row */}
      <p className="mt-4 font-heading text-[32px] font-bold leading-none text-text-heading">{value}</p>
      {/* Trend pill row — ALWAYS rendered (12px below number) */}
      {trend ? (
        <span className={`mt-3 inline-flex w-fit items-center gap-1 rounded-pill bg-white/60 px-2.5 py-1 text-xs font-semibold ${trendDirection === 'down' ? 'text-destructive-600' : 'text-status-success'}`}>
          {trendDirection === 'down' ? <ArrowDown size={12} strokeWidth={2.5} /> : <ArrowUp size={12} strokeWidth={2.5} />}
          {trend}
        </span>
      ) : (
        <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-pill bg-white/60 px-2.5 py-1 text-xs font-semibold text-text-muted">
          — No data yet
        </span>
      )}
    </div>
  )
}
