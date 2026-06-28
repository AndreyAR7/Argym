'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, Pencil, Trash2, Apple, Flame } from 'lucide-react'
import { NutritionFormModal } from '@/components/admin/nutrition-form-modal'
import { NutritionStatusButton } from '@/components/admin/nutrition-status-button'
import { Badge } from '@/components/ui/badge'
import { deleteNutritionPlanAction } from '@/lib/admin/nutrition-actions'
import { useConfirm } from '@/context/confirm-context'
import { useToast } from '@/context/toast-context'

interface NutritionPlan {
  id: string
  name: string
  description: string | null
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  goal: string | null
  status: string
  is_template: boolean
  created_at: string
}

interface NutritionPageClientProps {
  plans: NutritionPlan[]
}

export function NutritionPageClient({ plans }: NutritionPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [localPlans, setLocalPlans] = useState(plans)
  const { confirm } = useConfirm()
  const { showToast } = useToast()

  useEffect(() => { setLocalPlans(plans) }, [plans])

  function openCreate() {
    setEditingPlan(undefined)
    setModalOpen(true)
  }

  function openEdit(plan: NutritionPlan) {
    setEditingPlan(plan)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingPlan(undefined)
  }

  function handleDelete(plan: NutritionPlan) {
    startTransition(async () => {
      const ok = await confirm({
        title: 'Eliminar plan nutricional',
        message: `¿Eliminar "${plan.name}"? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return

      setDeletingId(plan.id)
      setLocalPlans((prev) => prev.filter((p) => p.id !== plan.id))
      const result = await deleteNutritionPlanAction(plan.id)
      if (result?.error) {
        setLocalPlans(plans)
        showToast('error', `No se pudo eliminar: ${result.error}`)
      } else {
        showToast('success', `Plan "${plan.name}" eliminado`)
      }
      setDeletingId(null)
    })
  }

  return (
    <div>
      {/* ── Top action bar ── */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          Nuevo plan nutricional
        </button>
      </div>

      {/* Plans table */}
      {localPlans.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-muted)] flex items-center justify-center">
            <Apple size={24} className="text-[var(--color-border)]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">No hay planes nutricionales</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Crea un plan nutricional usando el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden md:table-cell">Calorías</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider hidden lg:table-cell">Macros</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
              {localPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-[var(--color-muted)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-foreground)]">{plan.name}</p>
                    {plan.goal && (
                      <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{plan.goal}</p>
                    )}
                    {plan.is_template && (
                      <span className="text-[10px] font-semibold text-[var(--color-admin)] uppercase tracking-wide">Plantilla</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {plan.calories_target ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-[var(--color-foreground)]">
                        <Flame size={13} className="text-orange-500" />
                        {plan.calories_target.toLocaleString('es-CR')} kcal
                      </div>
                    ) : <span className="text-[var(--color-muted-foreground)]">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                      {plan.protein_g && <span className="font-medium text-blue-600">P {plan.protein_g}g</span>}
                      {plan.carbs_g && <span className="font-medium text-amber-600">C {plan.carbs_g}g</span>}
                      {plan.fat_g && <span className="font-medium text-rose-600">G {plan.fat_g}g</span>}
                      {!plan.protein_g && !plan.carbs_g && !plan.fat_g && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={plan.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <NutritionStatusButton planId={plan.id} status={plan.status} />
                      <button
                        onClick={() => openEdit(plan)}
                        title="Editar plan"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan)}
                        disabled={isPending && deletingId === plan.id}
                        title="Eliminar plan"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {isPending && deletingId === plan.id ? (
                          <span className="text-[10px]">…</span>
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <NutritionFormModal plan={editingPlan} onClose={closeModal} />
      )}
    </div>
  )
}
