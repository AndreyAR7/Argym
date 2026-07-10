'use client'

import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react'
import {
  upsertPlatformSubscriptionAction,
  suspendTenantPlatformAction,
  reactivateTenantPlatformAction,
} from './actions'

type Plan = { id: string; name: string; price_monthly: number; price_yearly: number; currency: string; trial_days: number }
type Sub  = { plan_id: string; status: string; billing_cycle: string; current_period_start: string; current_period_end: string } | null

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  active:    { label: 'Activo',     color: '#22c55e', bg: '#14532d33', icon: CheckCircle },
  trialing:  { label: 'Prueba',     color: '#60a5fa', bg: '#1e3a5f33', icon: Clock },
  past_due:  { label: 'Vencido',    color: '#f97316', bg: '#7c2d1233', icon: AlertTriangle },
  cancelled: { label: 'Cancelado',  color: '#737373', bg: '#1f1f1f',   icon: XCircle },
  expired:   { label: 'Expirado',   color: '#525252', bg: '#1f1f1f',   icon: XCircle },
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function PlatformSubscriptionForm({
  tenantId,
  plans,
  subscription,
}: {
  tenantId: string
  plans: Plan[]
  subscription: Sub
}) {
  const existingSub = subscription
  const defaultPlan = plans[1]?.id ?? plans[0]?.id ?? ''

  const [planId, setPlanId]       = useState(existingSub?.plan_id ?? defaultPlan)
  const [status, setStatus]       = useState(existingSub?.status ?? 'trialing')
  const [billing, setBilling]     = useState(existingSub?.billing_cycle ?? 'monthly')
  const [startDate, setStartDate] = useState(existingSub?.current_period_start?.split('T')[0] ?? todayStr())
  const [endDate, setEndDate]     = useState(existingSub?.current_period_end?.split('T')[0]   ?? addMonths(todayStr(), 1))
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  const StatusIcon = statusInfo.icon

  const presets = [
    { label: '1 mes',    months: 1 },
    { label: '3 meses',  months: 3 },
    { label: '6 meses',  months: 6 },
    { label: '1 año',    months: 12 },
  ]

  async function handleSave() {
    setLoading(true)
    setMsg(null)
    const result = await upsertPlatformSubscriptionAction({
      tenantId, planId, status, billingCycle: billing,
      periodStart: new Date(startDate).toISOString(),
      periodEnd:   new Date(endDate).toISOString(),
    })
    setLoading(false)
    setMsg(result.error
      ? { type: 'err', text: result.error }
      : { type: 'ok',  text: 'Suscripción actualizada correctamente.' })
  }

  async function handleSuspend() {
    if (!confirm('¿Suspender acceso a este gimnasio?')) return
    setLoading(true)
    await suspendTenantPlatformAction(tenantId)
    setStatus('past_due')
    setLoading(false)
    setMsg({ type: 'ok', text: 'Gimnasio suspendido.' })
  }

  async function handleReactivate() {
    setLoading(true)
    await reactivateTenantPlatformAction(tenantId)
    setStatus('active')
    setLoading(false)
    setMsg({ type: 'ok', text: 'Gimnasio reactivado.' })
  }

  const selectedPlan = plans.find(p => p.id === planId)

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: '#1f1f1f', background: '#111111' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: '#a3a3a3' }}>
          Suscripción de plataforma
        </h2>
        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: statusInfo.bg, color: statusInfo.color }}
        >
          <StatusIcon size={11} />
          {statusInfo.label}
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* Plan selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: '#737373' }}>Plan</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className="rounded-lg border p-3 text-left transition-all"
                style={{
                  borderColor: planId === p.id ? '#3b82f6' : '#1f1f1f',
                  background:  planId === p.id ? '#1e3a5f33' : '#111111',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: planId === p.id ? '#60a5fa' : '#e5e5e5' }}>
                  {p.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#525252' }}>
                  {p.currency} {p.price_monthly}/mes · {p.currency} {p.price_yearly}/año
                </p>
                {p.trial_days > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: '#60a5fa' }}>
                    {p.trial_days} días de prueba
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Status + billing cycle row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#737373' }}>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border text-sm px-3 py-2 outline-none focus:border-blue-500"
              style={{ background: '#111111', borderColor: '#1f1f1f', color: '#e5e5e5' }}
            >
              <option value="trialing">Prueba (trial)</option>
              <option value="active">Activo</option>
              <option value="past_due">Vencido</option>
              <option value="cancelled">Cancelado</option>
              <option value="expired">Expirado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: '#737373' }}>Ciclo de pago</label>
            <select
              value={billing}
              onChange={(e) => setBilling(e.target.value)}
              className="w-full rounded-md border text-sm px-3 py-2 outline-none focus:border-blue-500"
              style={{ background: '#111111', borderColor: '#1f1f1f', color: '#e5e5e5' }}
            >
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        </div>

        {/* Period */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: '#737373' }}>Período</label>
            {/* Quick presets */}
            <div className="flex gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const s = todayStr()
                    setStartDate(s)
                    setEndDate(addMonths(s, p.months))
                    if (p.months >= 12) setBilling('yearly')
                    else setBilling('monthly')
                  }}
                  className="text-xs px-2 py-0.5 rounded border transition-colors hover:border-blue-500 hover:text-blue-400"
                  style={{ borderColor: '#1f1f1f', color: '#737373' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs" style={{ color: '#525252' }}>Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border text-sm px-3 py-2 outline-none focus:border-blue-500"
                style={{ background: '#111111', borderColor: '#1f1f1f', color: '#e5e5e5', colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: '#525252' }}>Vencimiento</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border text-sm px-3 py-2 outline-none focus:border-blue-500"
                style={{ background: '#111111', borderColor: '#1f1f1f', color: '#e5e5e5', colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

        {/* Price summary */}
        {selectedPlan && (
          <div
            className="rounded-md px-4 py-3 text-sm flex justify-between items-center"
            style={{ background: '#111111', border: '1px solid #1f1f1f' }}
          >
            <span style={{ color: '#737373' }}>Monto registrado</span>
            <span className="font-semibold tabular-nums" style={{ color: '#e5e5e5' }}>
              {selectedPlan.currency}{' '}
              {billing === 'yearly'
                ? `${selectedPlan.price_yearly.toLocaleString('es-CR')}/año`
                : `${selectedPlan.price_monthly.toLocaleString('es-CR')}/mes`}
            </span>
          </div>
        )}

        {/* Feedback */}
        {msg && (
          <p
            className="text-sm px-3 py-2 rounded-md"
            style={{
              background: msg.type === 'ok' ? '#14532d33' : '#7c2d1233',
              color:      msg.type === 'ok' ? '#22c55e'   : '#f97316',
            }}
          >
            {msg.text}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
            Guardar cambios
          </button>

          {status !== 'past_due' && status !== 'cancelled' && status !== 'expired' ? (
            <button
              type="button"
              onClick={handleSuspend}
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm font-medium border transition-colors disabled:opacity-50 hover:border-orange-500 hover:text-orange-400"
              style={{ borderColor: '#1f1f1f', color: '#737373' }}
            >
              Suspender acceso
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReactivate}
              disabled={loading}
              className="rounded-md px-4 py-2 text-sm font-medium border transition-colors disabled:opacity-50 hover:border-green-500 hover:text-green-400"
              style={{ borderColor: '#1f1f1f', color: '#737373' }}
            >
              Reactivar acceso
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
