import type { LucideIcon } from 'lucide-react'
export default function IconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-surface text-text-body shadow-card transition-colors hover:bg-brand-sky">
      <Icon size={18} strokeWidth={1.75} />
    </button>
  )
}
