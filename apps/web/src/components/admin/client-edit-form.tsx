'use client'

import { useState, useTransition } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { updateClientProfileAction, toggleClientActiveAction } from '@/lib/admin/client-actions'

interface ClientEditFormProps {
  client: {
    id: string
    full_name: string | null
    phone: string | null
    client_level: string | null
    is_active: boolean
  }
}

const LEVEL_OPTIONS: { value: string | null; label: string }[] = [
  { value: null,           label: 'Sin nivel'    },
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio'   },
  { value: 'advanced',     label: 'Avanzado'     },
]

export function ClientEditForm({ client }: ClientEditFormProps) {
  const [fullName, setFullName]     = useState(client.full_name ?? '')
  const [phone, setPhone]           = useState(client.phone ?? '')
  const [level, setLevel]           = useState<string | null>(client.client_level)
  const [isActive, setIsActive]     = useState(client.is_active)
  const [error, setError]           = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!fullName.trim()) {
      setError('El nombre completo es obligatorio')
      return
    }
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const [profileResult, activeResult] = await Promise.all([
        updateClientProfileAction(client.id, {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          client_level: level,
        }),
        toggleClientActiveAction(client.id, isActive),
      ])

      const err = profileResult?.error ?? activeResult?.error
      if (err) {
        setError(err)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Full name */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
          Nombre completo <span className="text-[var(--color-destructive)]">*</span>
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setSaved(false) }}
          placeholder="Ej. María González"
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
          Teléfono
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setSaved(false) }}
          placeholder="Ej. +506 8888-0000"
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
        />
      </div>

      {/* Client level */}
      <div>
        <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
          Nivel del cliente
        </label>
        <select
          value={level ?? ''}
          onChange={(e) => { setLevel(e.target.value || null); setSaved(false) }}
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-admin)] cursor-pointer"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value ?? '__null'} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
        <input
          id="client-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => { setIsActive(e.target.checked); setSaved(false) }}
          className="w-4 h-4 rounded border-[var(--color-input)] accent-[var(--color-admin)] cursor-pointer"
        />
        <label
          htmlFor="client-active"
          className="text-sm font-medium text-[var(--color-foreground)] cursor-pointer select-none"
        >
          Cuenta activa
        </label>
        <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
          {isActive ? 'El cliente puede iniciar sesión' : 'Acceso bloqueado'}
        </span>
      </div>

      {/* Feedback */}
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

      {/* Submit */}
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
