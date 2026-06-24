'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createPromotionAction, updatePromotionAction } from '@/lib/admin/content-actions'

interface Promotion {
  id: string
  title: string
  description: string | null
  type: string
  discount_percentage: number | null
  discount_amount: number | null
  start_date: string
  end_date: string | null
}

interface PromotionFormModalProps {
  promotion?: Promotion | null
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  discount:     'Descuento',
  announcement: 'Anuncio',
  bundle:       'Paquete',
}

export function PromotionFormModal({ promotion, onClose }: PromotionFormModalProps) {
  const [title, setTitle] = useState(promotion?.title ?? '')
  const [description, setDescription] = useState(promotion?.description ?? '')
  const [type, setType] = useState<'discount' | 'announcement' | 'bundle'>(
    (promotion?.type as 'discount' | 'announcement' | 'bundle') ?? 'announcement'
  )
  const [discountPct, setDiscountPct] = useState(promotion?.discount_percentage?.toString() ?? '')
  const [discountAmt, setDiscountAmt] = useState(promotion?.discount_amount?.toString() ?? '')
  const [startDate, setStartDate] = useState(
    promotion?.start_date ? promotion.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [endDate, setEndDate] = useState(
    promotion?.end_date ? promotion.end_date.slice(0, 10) : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    setError(null)

    startTransition(async () => {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        discount_percentage: discountPct ? parseFloat(discountPct) : null,
        discount_amount: discountAmt ? parseFloat(discountAmt) : null,
        start_date: startDate,
        end_date: endDate || null,
      }

      const result = promotion
        ? await updatePromotionAction(promotion.id, data)
        : await createPromotionAction(data)

      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            {promotion ? 'Editar promoción' : 'Nueva promoción'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Título <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. 20% de descuento en enero"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalles de la promoción..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none"
            />
          </div>

          {/* Type */}
          {!promotion && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Tipo</label>
              <div className="flex gap-2">
                {(['announcement', 'discount', 'bundle'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                      type === t
                        ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-ring)]'
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discount fields — only when type = discount */}
          {type === 'discount' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  % Descuento
                </label>
                <input
                  type="number"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  min="0" max="100" step="0.01"
                  placeholder="20"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                  Monto fijo
                </label>
                <input
                  type="number"
                  value={discountAmt}
                  onChange={(e) => setDiscountAmt(e.target.value)}
                  min="0"
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Fecha inicio <span className="text-[var(--color-destructive)]">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Fecha fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 space-y-3">
          {error && (
            <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {isPending ? 'Guardando…' : promotion ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
