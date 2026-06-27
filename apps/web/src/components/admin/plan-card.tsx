'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, Users, ToggleLeft, ToggleRight, Trash2, CalendarClock } from 'lucide-react'
import { togglePlanActiveAction, deletePlanAction } from '@/lib/admin/actions'
import { PlanFormModal } from './plan-form-modal'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  billing_cycle: string
  features: { name: string; value: string }[]
  is_active: boolean
  subscriber_count: number
  expiry_date?: string | null
  plan_tier?: string | null
}

const TIER_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

interface PlanCardProps {
  plan: Plan
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'mes',
  yearly: 'año',
  one_time: 'único',
}

const CYCLE_BADGE: Record<string, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  one_time: 'Pago único',
}

export function PlanCard({ plan }: PlanCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await togglePlanActiveAction(plan.id, !plan.is_active)
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deletePlanAction(plan.id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setConfirmDelete(false)
      }
    })
  }

  const currencySymbol = plan.currency === 'USD' ? '$' : '₡'

  const expiryInfo = (() => {
    if (!plan.expiry_date) return null
    const exp = new Date(plan.expiry_date)
    const now = new Date()
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const label = exp.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
    if (diffDays < 0) return { label: `Expiró ${label}`, color: 'text-red-600 bg-red-50 border-red-200' }
    if (diffDays <= 7) return { label: `Expira en ${diffDays}d`, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: `Expira ${label}`, color: 'text-[var(--color-muted-foreground)] bg-[var(--color-muted)] border-[var(--color-border)]' }
  })()

  return (
    <>
      <div
        className={`relative flex flex-col rounded-2xl border bg-[var(--color-card)] overflow-hidden transition-all ${
          plan.is_active
            ? 'border-[var(--color-border)] shadow-sm hover:shadow-md'
            : 'border-[var(--color-border)] opacity-60'
        }`}
      >
        {/* Status bar */}
        {plan.is_active && (
          <div className="h-0.5 bg-[var(--color-admin)] w-full" />
        )}

        <div className="p-6 flex flex-col flex-1">
          {/* Top row: name + cycle badge */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--color-foreground)] truncate">{plan.name}</h3>
              {plan.description && (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 line-clamp-2">
                  {plan.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md bg-[var(--color-admin-light)] text-[var(--color-admin)]">
                {CYCLE_BADGE[plan.billing_cycle] ?? plan.billing_cycle}
              </span>
              {plan.plan_tier && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                  {TIER_LABELS[plan.plan_tier] ?? plan.plan_tier}
                </span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-[var(--color-muted-foreground)]">{plan.currency}</span>
              <span className="text-3xl font-bold text-[var(--color-foreground)] tabular-nums">
                {plan.price.toLocaleString('es-CR')}
              </span>
              {plan.billing_cycle !== 'one_time' && (
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  /{CYCLE_LABELS[plan.billing_cycle]}
                </span>
              )}
            </div>
          </div>

          {/* Features */}
          {plan.features.length > 0 && (
            <ul className="flex-1 space-y-2 mb-5">
              {plan.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-foreground)]">
                  <Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                  {feat.name}
                </li>
              ))}
            </ul>
          )}

          {/* Expiry badge */}
          {expiryInfo && (
            <div className={`mb-4 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border w-fit ${expiryInfo.color}`}>
              <CalendarClock size={12} />
              {expiryInfo.label}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <Users size={13} />
              {plan.subscriber_count} suscriptor{plan.subscriber_count !== 1 ? 'es' : ''}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEdit(true)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                title="Editar plan"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Eliminar plan"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={handleToggle}
                disabled={isPending}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-50"
                style={{ color: plan.is_active ? 'var(--color-admin)' : 'var(--color-muted-foreground)' }}
                title={plan.is_active ? 'Desactivar plan' : 'Activar plan'}
              >
                {plan.is_active
                  ? <ToggleRight size={18} />
                  : <ToggleLeft size={18} />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <PlanFormModal plan={plan} onClose={() => setShowEdit(false)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">Eliminar plan</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-foreground)]">
              ¿Estás seguro de que deseas eliminar <span className="font-semibold">{plan.name}</span>?
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
