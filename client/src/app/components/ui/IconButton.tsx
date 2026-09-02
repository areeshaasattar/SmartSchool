import type { LucideIcon } from 'lucide-react'
export default function IconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) { return <button type="button" onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white text-text-body shadow-sm hover:bg-accent-blue-soft"><Icon size={18} /></button> }
