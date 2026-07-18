'use client'

import { useState, useTransition, useRef } from 'react'
import { MoreHorizontal, UserX, UserCheck, Tag, Pencil, Building2 } from 'lucide-react'
import { toggleProfileActiveAction, assignPlanAction, assignUserToBranchAction } from '@/lib/admin/actions'

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
  branchId: string | null
  branches: { id: string; name: string }[]
  activePlanName?: string | null
}

export function ClientRowActions({
  clientId,
  clientName,
  isActive,
  plans,
  tenantId,
  branchId,
  branches,
  activePlanName,
}: ClientRowActionsProps) {
  const [open, setOpen] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [showBranch, setShowBranch] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  // Menu has 4 items + a divider (~170px tall). Flip it upward when there
  // isn't enough room below the trigger — otherwise it renders past the
  // bottom of the viewport for rows near the end of the list, with no way
  // to scroll down to reach it.
  const MENU_HEIGHT_ESTIMATE = 170

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < MENU_HEIGHT_ESTIMATE && rect.top > MENU_HEIGHT_ESTIMATE

      setPos(openUpward
        ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, right: window.innerWidth - rect.right },
      )
    }
    setOpen(v => !v)
  }

  function handleActionsMenuToggleClick() {
    setOpen(false)
    if (isActive) {
      // Deactivating needs the active-plan check dialog; reactivating is safe to run directly.
      setDeactivateError(null)
      setShowDeactivate(true)
    } else {
      startTransition(async () => { await toggleProfileActiveAction(clientId, true) })
    }
  }

  function confirmDeactivate() {
    startTransition(async () => {
      const result = await toggleProfileActiveAction(clientId, false)
      if (result?.error) {
        setDeactivateError(result.error)
      } else {
        setShowDeactivate(false)
      }
    })
  }

  async function handleAssignBranch(bid: string | null) {
    startTransition(async () => {
      await assignUserToBranchAction(clientId, bid)
      setShowBranch(false)
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
          ref={btnRef}
          onClick={handleOpen}
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          aria-label="Acciones"
        >
          <MoreHorizontal size={15} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            {/* Fixed position — never clipped by table overflow; flips
                upward near the bottom of the viewport (see handleOpen) */}
            <div
              className="fixed z-50 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg py-1 text-sm"
              style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
            >
              <button
                onClick={() => { setOpen(false); setShowAssign(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <Tag size={13} className="text-[var(--color-muted-foreground)]" />
                Asignar plan
              </button>
              <button
                onClick={() => { setOpen(false); setShowBranch(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <Building2 size={13} className="text-[var(--color-muted-foreground)]" />
                Asignar sucursal
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
                onClick={handleActionsMenuToggleClick}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:opacity-50 hover:bg-[var(--color-muted)]"
                style={{ color: isActive ? 'var(--color-destructive)' : 'var(--color-coach)' }}
              >
                {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                {isPending ? 'Actualizando…' : isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Assign branch modal */}
      {showBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-1">Asignar sucursal</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
              Selecciona la sucursal para <strong>{clientName}</strong>
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => handleAssignBranch(null)}
                className={"w-full flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all " + (branchId === null ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)]' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]')}
              >
                <p className="text-sm font-medium text-[var(--color-foreground)]">Sin sucursal</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">Cuenta principal</p>
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleAssignBranch(b.id)}
                  className={"w-full flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all " + (branchId === b.id ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)]' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]')}
                >
                  <Building2 size={15} className="text-[var(--color-muted-foreground)] flex-shrink-0" />
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{b.name}</p>
                </button>
              ))}
              {branches.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">No hay sucursales creadas</p>
              )}
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowBranch(false)}
                className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign plan modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
            <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-1">Asignar plan</h2>
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
                <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">No hay planes disponibles</p>
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

      {/* Deactivate confirmation / active-plan block */}
      {showDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-xl">
            {activePlanName ? (
              <>
                <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-1">No se puede desactivar</h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
                  <strong>{clientName}</strong> tiene un plan activo (<strong>{activePlanName}</strong>). Cancela su suscripción antes de desactivar la cuenta.
                </p>
                <button
                  onClick={() => setShowDeactivate(false)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                >
                  Entendido
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-1">Desactivar usuario</h2>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-5">
                  ¿Confirmás que querés desactivar a <strong>{clientName}</strong>? No tiene planes activos.
                </p>
                {deactivateError && (
                  <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/5 border border-[var(--color-destructive)]/20 rounded-lg px-3 py-2 mb-4">
                    {deactivateError}
                  </p>
                )}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowDeactivate(false)}
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeactivate}
                    disabled={isPending}
                    className="flex-1 rounded-lg bg-[var(--color-destructive)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? 'Desactivando…' : 'Desactivar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
