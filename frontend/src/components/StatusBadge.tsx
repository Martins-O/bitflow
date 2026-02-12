import type { InvoiceStatus } from '@/types'

const badgeStyles: Record<string, string> = {
  PENDING: 'border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
  PAID: 'border-emerald-500/40 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
  RELEASED: 'border-teal-500/40 text-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.15)]',
  EXPIRED: 'border-red-500/40 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]',
}

interface Props {
  status: InvoiceStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider border bg-dark-secondary/60 ${badgeStyles[status] ?? ''}`}
    >
      {status === 'PENDING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-glow" />
      )}
      {status}
    </span>
  )
}
