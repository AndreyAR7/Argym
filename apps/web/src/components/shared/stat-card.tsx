import Link from 'next/link'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  accentClass?: string
  href?: string
  trend?: { value: number; label: string }
}

export function StatCard({ label, value, icon, accentClass, href, trend }: StatCardProps) {
  const content = (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-all hover:shadow-sm hover:border-[var(--color-ring)]/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {value}
          </p>
          {trend && (
            <p className={cn('mt-1 text-xs', trend.value >= 0 ? 'text-[var(--color-coach)]' : 'text-[var(--color-destructive)]')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('mt-0.5 flex-shrink-0', accentClass)}>
          {icon}
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}
