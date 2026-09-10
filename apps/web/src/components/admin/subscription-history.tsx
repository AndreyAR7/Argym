'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { unassignPlanAction } from '@/lib/admin/actions'

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
  clientName?: string
}

function isCurrent(sub: Subscription): boolean {
  if (sub.status !== 'active') return false
  if (!sub.end_date) return true
  return new Date(sub.end_date) >= new Date()
}

export function SubscriptionHistory({ subscriptions, clientName }: SubscriptionHistoryProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [target, setTarget] = useState<Subscription | null>(null)
  const [result, setResult] = useState<{ error?: string; success?: true; refunded?: boolean; refundAmount?: number; refundError?: string } | null>(null)

  function handleUnassign() {
    if (!target) return
    startTransition(async () => {
      const res = await unassignPlanAction(target.id, 'Revertido por administrador desde el perfil del cliente')
      setResult(res)
      if (res?.success && !res.refundError) {
        router.refresh()
      }
    })
  }

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
            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide">
              Acciones
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

                {/* Unassign (revert) */}
                <td className="px-4 py-3 text-right">
                  {sub.status === 'active' && (
                    <button
                      onClick={() => { setTarget(sub); setResult(null) }}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/5 transition-colors"
                    >
                      <Ban size={12} />
                      Desasignar
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <TriangleAlert size={18} className="text-[var(--color-destructive)] flex-shrink-0" />
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Desasignar plan</h2>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
              ¿Confirmás que querés revertir el plan <strong>{target.plans?.name}</strong>{clientName ? <> de <strong>{clientName}</strong></> : null}? Se cancelará de inmediato.
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              Si el cliente lo pagó por Stripe, se reembolsará automáticamente. Si fue una asignación manual, cualquier devolución de dinero se maneja por fuera de la app.
            </p>
            {result?.error && (
              <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/5 border border-[var(--color-destructive)]/20 rounded-lg px-3 py-2 mb-4">
                {result.error}
              </p>
            )}
            {result?.success && (
              <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 mb-4">
                {result.refunded
                  ? `Plan desasignado y reembolso de ${result.refundAmount?.toLocaleString('es-CR')} procesado en Stripe.`
                  : result.refundError
                    ? `Plan desasignado. El reembolso automático falló: ${result.refundError}. Procesalo manualmente en Stripe.`
                    : 'Plan desasignado.'}
              </p>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => { setTarget(null); setResult(null) }}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
              >
                {result?.success ? 'Cerrar' : 'Cancelar'}
              </button>
              {!result?.success && (
                <button
                  onClick={handleUnassign}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-[var(--color-destructive)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Procesando…' : 'Sí, desasignar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
