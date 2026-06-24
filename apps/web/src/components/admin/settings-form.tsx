'use client'

import { useState, useTransition } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { updateTenantSettingsAction } from '@/lib/admin/settings-actions'

interface Tenant {
  id: string
  name: string
  slug: string
  timezone: string
  currency: string
  locale: string
  logo_url: string | null
  is_active: boolean
  created_at: string
}

interface SettingsFormProps {
  tenant: Tenant
  timezones: { value: string; label: string }[]
}

export function SettingsForm({ tenant, timezones }: SettingsFormProps) {
  const [name, setName] = useState(tenant.name)
  const [timezone, setTimezone] = useState(tenant.timezone)
  const [currency, setCurrency] = useState(tenant.currency)
  const [locale, setLocale] = useState(tenant.locale)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateTenantSettingsAction({ name, timezone, currency, locale })
      if (result?.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <div className="space-y-6">
      {/* General */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Información general</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Nombre e identificador de tu negocio</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre del negocio <span className="text-[var(--color-destructive)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Identificador (slug)
            </label>
            <input
              type="text"
              value={tenant.slug}
              disabled
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              El identificador no se puede cambiar.
            </p>
          </div>
        </div>
      </section>

      {/* Regional */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Configuración regional</h3>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Zona horaria, moneda e idioma</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Zona horaria
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
              >
                <option value="CRC">CRC — Colón costarricense (₡)</option>
                <option value="USD">USD — Dólar americano ($)</option>
                <option value="MXN">MXN — Peso mexicano ($)</option>
                <option value="COP">COP — Peso colombiano ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Idioma</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
              >
                <option value="es-CR">Español (Costa Rica)</option>
                <option value="es-MX">Español (México)</option>
                <option value="es-ES">Español (España)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Account info */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Información de la cuenta</h3>
        </div>
        <div className="p-6">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted-foreground)]">ID del tenant</dt>
              <dd className="font-mono text-xs text-[var(--color-foreground)]">{tenant.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted-foreground)]">Estado</dt>
              <dd className={`font-medium text-xs ${tenant.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
                {tenant.is_active ? 'Activo' : 'Inactivo'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-muted-foreground)]">Creado</dt>
              <dd className="text-[var(--color-foreground)]">
                {new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' }).format(new Date(tenant.created_at))}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Save */}
      {error && (
        <p className="text-xs text-[var(--color-destructive)] bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <CheckCircle size={15} />
          Cambios guardados correctamente
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-[var(--color-admin)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Save size={14} />
        {isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
