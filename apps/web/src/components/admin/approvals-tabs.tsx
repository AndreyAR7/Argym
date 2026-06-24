'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ApprovalsTabsProps {
  current: string
  counts: { pending: number; approved: number; rejected: number }
}

const TABS = [
  { value: 'pending',  label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
]

export function ApprovalsTabs({ current, counts }: ApprovalsTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-[var(--color-muted)] rounded-lg p-1 w-fit">
      {TABS.map((tab) => {
        const count = counts[tab.value as keyof typeof counts]
        const isActive = current === tab.value
        return (
          <Link
            key={tab.value}
            href={`/admin/approvals?status=${tab.value}`}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            )}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4',
                  tab.value === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : tab.value === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700',
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
