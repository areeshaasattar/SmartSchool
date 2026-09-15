import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Empty-state block for cards: sits near the top of the card (below the title),
 * stacked with 12px gaps — never vertically centered in a tall empty box.
 */
export default function EmptyState({ icon: Icon, message, action }: { icon: LucideIcon; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 py-2">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary-100 text-text-muted">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  )
}
