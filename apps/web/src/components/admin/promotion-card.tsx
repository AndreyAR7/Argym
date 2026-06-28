'use client'

import { useState, useTransition } from 'react'
import { Pencil, ToggleLeft, ToggleRight, Percent, Megaphone, Package, Trash2 } from 'lucide-react'
import { togglePromotionActiveAction, deletePromotionAction } from '@/lib/admin/content-actions'
import { PromotionFormModal, type PromotionPlan, type PromotionBranch } from './promotion-form-modal'
import { formatDate } from '@/lib/utils'

interface Promotion {
  id: string
  title: string
  description: string | null
  type: string
  discount_percentage: number | null
  discount_amount: number | null
  start_date: string
  end_date: string | null
  is_active: boolean
  applies_to_plan_id?: string | null
  branch_id?: string | null
}

const TYPE_CONFIG = {
  discount:     { icon: Percent,    label: 'Descuento',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  announcement: { icon: Megaphone,  label: 'Anuncio',    color: 'text-blue-700 bg-blue-50 border-blue-200' },
  bundle:       { icon: Package,    label: 'Paquete',    color: 'text-violet-700 bg-violet-50 border-violet-200' },
}

export function PromotionCard({ promotion, plans = [], branches = [] }: { promotion: Promotion; plans?: PromotionPlan[]; branches?: PromotionBranch[] }) {
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const config = TYPE_CONFIG[promotion.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.announcement
  const Icon = config.icon

  function handleToggle() {
    startTransition(async () => {
      await togglePromotionActiveAction(promotion.id, !promotion.is_active)
    })
  }

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deletePromotionAction(promotion.id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setConfirmDelete(false)
      }
    })
  }

  const branchName = promotion.branch_id ? (branches.find((b) => b.id === promotion.branch_id)?.name ?? null) : null

  const discountText = promotion.type === 'discount'
    ? promotion.discount_percentage
      ? `${promotion.discount_percentage}% de descuento`
      : promotion.discount_amount
      ? `₡${promotion.discount_amount.toLocaleString('es-CR')} de descuento`
      : null
    : null

  return (
    <>
      <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-ring)]/30 transition-all">
        {/* Type icon */}
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[var(--color-foreground)] truncate">{promotion.title}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {discountText && (
              <span className="text-xs font-semibold text-emerald-700">{discountText}</span>
            )}
            {branchName && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                {branchName}
              </span>
            )}
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {formatDate(promotion.start_date)}
              {promotion.end_date ? ` → ${formatDate(promotion.end_date)}` : ' · Sin vencimiento'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Eliminar promoción"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-50"
            style={{ color: promotion.is_active ? 'var(--color-admin)' : 'var(--color-muted-foreground)' }}
          >
            {promotion.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
        </div>
      </div>

      {showEdit && (
        <PromotionFormModal promotion={promotion} plans={plans} branches={branches} onClose={() => setShowEdit(false)} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">Eliminar promoción</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-foreground)]">
              ¿Estás seguro de que deseas eliminar <span className="font-semibold">{promotion.title}</span>?
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
