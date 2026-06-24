'use client'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Subscription {
  id: string
  status: string
  final_price: number | null
  start_date: string
  end_date: string | null
  plans: { name: string; currency: string } | null
}

interface SubscriptionHistoryProps {
  subscriptions: Subscription[]
}

function isCurrent(sub: Subscription): boolean {
  if (sub.status !== 'active') return false
  if (!sub.end_date) return true
  return new Date(sub.end_date) >= new Date()
}

export function SubscriptionHistory({ subscriptions }: SubscriptionHistoryProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">Sin historial de suscripciones</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
              Plan
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
              Precio
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide hidden sm:table-cell">
              Inicio
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide hidden sm:table-cell">
              Vence
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
              Vigencia
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {subscriptions.map((sub) => {
            const current = isCurrent(sub)
            const currency = sub.plans?.currency ?? 'CRC'

            return (
              <tr key={sub.id} className="hover:bg-[var(--color-muted)] transition-colors">
                {/* Plan name */}
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--color-foreground)]">
                    {sub.plans?.name ?? '—'}
                  </p>
                </td>

                {/* Price */}
                <td className="px-4 py-3 tabular-nums text-[var(--color-foreground)]">
                  {sub.final_price != null
                    ? formatCurrency(sub.final_price, currency)
                    : '—'}
                </td>

                {/* Status badge */}
                <td className="px-4 py-3">
                  <Badge value={sub.status} />
                </td>

                {/* Start date */}
                <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] hidden sm:table-cell">
                  {formatDate(sub.start_date)}
                </td>

                {/* End date */}
                <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)] hidden sm:table-cell">
                  {sub.end_date ? formatDate(sub.end_date) : '—'}
                </td>

                {/* Current / expired label */}
                <td className="px-4 py-3 text-right">
                  {current ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Vigente
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-muted-foreground)]">Expirada</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
