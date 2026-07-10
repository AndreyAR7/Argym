'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTenantAction } from '../[id]/actions'

const TIMEZONES = [
  { value: 'America/Costa_Rica',            label: 'América/Costa Rica (GMT-6)' },
  { value: 'America/Mexico_City',           label: 'América/Ciudad de México (GMT-6)' },
  { value: 'America/Bogota',                label: 'América/Bogotá (GMT-5)' },
  { value: 'America/Lima',                  label: 'América/Lima (GMT-5)' },
  { value: 'America/Santiago',              label: 'América/Santiago (GMT-3)' },
  { value: 'America/Argentina/Buenos_Aires',label: 'América/Buenos Aires (GMT-3)' },
  { value: 'America/New_York',              label: 'América/Nueva York (GMT-5)' },
  { value: 'UTC',                           label: 'UTC (GMT+0)' },
]

const field = 'w-full px-3.5 py-2.5 text-sm rounded-md border outline-none transition-all'
const fieldStyle = { background: '#111111', borderColor: '#2a2a2a', color: '#e5e5e5' }
const labelStyle = { color: '#737373' }

export function NewTenantForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name:     '',
    slug:     '',
    timezone: 'America/Costa_Rica',
    currency: 'CRC',
    locale:   'es-CR',
  })

  function set(k: keyof typeof form, v: string) {
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'name' && !f.slug) {
        next.slug = v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.slug.trim()) { setError('El slug es obligatorio'); return }
    setError(null)

    startTransition(async () => {
      const result = await createTenantAction(form)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/super-admin/tenants')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
          Nombre del gimnasio *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej. GymPro Costa Rica"
          className={field}
          style={fieldStyle}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
          Slug (identificador único) *
        </label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="Ej. gympro-cr"
          className={field}
          style={fieldStyle}
          required
        />
        <p className="text-[10px] mt-1" style={{ color: '#525252' }}>
          Solo letras minúsculas, números y guiones
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
          Zona horaria
        </label>
        <select
          value={form.timezone}
          onChange={(e) => set('timezone', e.target.value)}
          className={field}
          style={fieldStyle}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
            Moneda
          </label>
          <select
            value={form.currency}
            onChange={(e) => set('currency', e.target.value)}
            className={field}
            style={fieldStyle}
          >
            <option value="CRC">CRC — Colón</option>
            <option value="USD">USD — Dólar</option>
            <option value="MXN">MXN — Peso MX</option>
            <option value="COP">COP — Peso CO</option>
            <option value="PEN">PEN — Sol</option>
            <option value="ARS">ARS — Peso AR</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
            Locale
          </label>
          <select
            value={form.locale}
            onChange={(e) => set('locale', e.target.value)}
            className={field}
            style={fieldStyle}
          >
            <option value="es-CR">es-CR</option>
            <option value="es-MX">es-MX</option>
            <option value="es-CO">es-CO</option>
            <option value="es-PE">es-PE</option>
            <option value="es-AR">es-AR</option>
            <option value="en-US">en-US</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-xs rounded-md px-3 py-2.5" style={{ background: '#2a1111', color: '#ef4444', border: '1px solid #3a1515' }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 rounded-md text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: '#f97316', color: '#fff' }}
        >
          {isPending ? 'Creando…' : 'Crear gimnasio'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/super-admin/tenants')}
          className="px-4 py-2.5 rounded-md text-sm transition-all"
          style={{ background: '#1a1a1a', color: '#737373', border: '1px solid #2a2a2a' }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
