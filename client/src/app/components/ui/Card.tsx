import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
export default function Card({ title, children, className = '', action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-card bg-surface p-6 shadow-card ${className}`}>
      {title && (
        <header className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-text-heading">{title}</h2>
          {action ?? (
            <button aria-label="More options" className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-brand-sky">
              <MoreHorizontal size={18} strokeWidth={1.75} />
            </button>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
