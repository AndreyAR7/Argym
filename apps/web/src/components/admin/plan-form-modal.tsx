'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createPlanAction, updatePlanAction } from '@/lib/admin/actions'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  billing_cycle: string
  features: { name: string; value: string }[]
  is_active: boolean
  expiry_date?: string | null
}

interface PlanFormModalProps {
  plan?: Plan | null
  onClose: () => void
}

const BILLING_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
  one_time: 'Pago único',
}

export function PlanFormModal({ plan, onClose }: PlanFormModalProps) {
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [price, setPrice] = useState(plan?.price?.toString() ?? '0')
  const [currency, setCurrency] = useState(plan?.currency ?? 'CRC')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'one_time'>(
    (plan?.billing_cycle as 'monthly' | 'yearly' | 'one_time') ?? 'monthly'
  )
  const [features, setFeatures] = useState<string[]>(
    plan?.features?.map((f) => f.name) ?? ['']
  )
  const [expiryDate, setExpiryDate] = useState(
    plan?.expiry_date ? plan.expiry_date.slice(0, 10) : ''
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addFeature() {
    setFeatures((prev) => [...prev, ''])
  }

  function removeFeature(idx: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateFeature(idx: number, val: string) {
    setFeatures((prev) => prev.map((f, i) => (i === idx ? val : f)))
  }

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) { setError('El precio no es válido'); return }
    setError(null)

    startTransition(async () => {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        currency,
        billing_cycle: billingCycle,
        features: features.filter((f) => f.trim()),
        expiry_date: expiryDate || null,
      }

      const result = plan
        ? await updatePlanAction(plan.id, data)
        : await createPlanAction(data)

      if (result?.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-[var(--color-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              {plan ? 'Editar plan' : 'Nuevo plan'}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              {plan ? 'Modifica los detalles del plan' : 'Define precios y características'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre del plan <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Plan Básico"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el plan..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none"
            />
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Precio <span className="text-[var(--color-destructive)]">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
              >
                <option value="CRC">CRC (₡)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          {/* Billing cycle */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Ciclo de facturación
            </label>
            <div className="flex gap-2">
              {(['monthly', 'yearly', 'one_time'] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    billingCycle === cycle
                      ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-ring)]'
                  }`}
                >
                  {BILLING_LABELS[cycle]}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Fecha de caducidad
              <span className="text-[var(--color-muted-foreground)] font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
            <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">
              Después de esta fecha el plan no estará disponible para nuevas suscripciones.
            </p>
          </div>

          {/* Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--color-foreground)]">
                Características
              </label>
              <button
                type="button"
                onClick={addFeature}
                className="flex items-center gap-1 text-xs text-[var(--color-admin)] hover:opacity-80 transition-opacity"
              >
                <Plus size={12} />
                Agregar
              </button>
            </div>
            <div className="space-y-2">
              {features.map((feat, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={feat}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    placeholder={`Ej. Acceso a todas las clases`}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    disabled={features.length === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-red-50 transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-3">
          {error && (
            <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : plan ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
