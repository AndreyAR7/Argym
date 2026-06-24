'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, UserX, UserCheck, Tag, Pencil } from 'lucide-react'
import { toggleProfileActiveAction, assignPlanAction } from '@/lib/admin/actions'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_cycle: string
  plan_tier: string | null
}

interface ClientRowActionsProps {
  clientId: string
  clientName: string
  isActive: boolean
  clientLevel: string | null
  plans: Plan[]
  tenantId: string
}

export function ClientRowActions({
  clientId,
  clientName,
  isActive,
  plans,
  tenantId,
}: ClientRowActionsProps) {
  const [open, setOpen] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggleActive() {
    startTransition(async () => {
      await toggleProfileActiveAction(clientId, !isActive)
      setOpen(false)
    })
  }

  function handleAssignPlan() {
    if (!selectedPlan) return
    startTransition(async () => {
      await assignPlanAction(clientId, tenantId, selectedPlan.id, selectedPlan.price)
      setShowAssign(false)
      setSelectedPlan(null)
    })
  }

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={() => setOpen(!open)}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          aria-label="Acciones"
        >
          <MoreHorizontal size={15} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg py-1 text-sm">
              <button
                onClick={() => { setOpen(false); setShowAssign(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <Tag size={13} className="text-[var(--color-muted-foreground)]" />
                Asignar plan
              </button>
              <a
                href={`/admin/clients/${clientId}`}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                onClick={() => setOpen(false)}
              >
                <Pencil size={13} className="text-[var(--color-muted-foreground)]" />
                Ver perfil
              </a>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <button
                onClick={handleToggleActive}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-50 hover:bg-[var(--color-muted)]"
                style={{ color: isActive ? 'var(--color-destructive)' : 'var(--color-coach)' }}
              >
                {isActive
                  ? <UserX size={13} />
                  : <UserCheck size={13} />}
                {isPending ? 'Actualizando…' : isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Assign plan modal ── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-1">
              Asignar plan
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              Selecciona el plan para <strong>{clientName}</strong>
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {plans.length > 0 ? plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-all ${
                    selectedPlan?.id === plan.id
                      ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{plan.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {plan.billing_cycle === 'monthly' ? 'Mensual' : plan.billing_cycle === 'yearly' ? 'Anual' : 'Único'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-foreground)] flex-shrink-0">
                    {plan.currency} {plan.price.toLocaleString('es-CR')}
                  </span>
                </button>
              )) : (
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
                  No hay planes disponibles
                </p>
              )}
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => { setShowAssign(false); setSelectedPlan(null) }}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedPlan || isPending}
                className="flex-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? 'Asignando…' : 'Asignar plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
