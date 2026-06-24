'use client'

import { useState, useTransition } from 'react'
import { User, Mail, Phone, Calendar, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { updateMyProfileAction } from '@/lib/admin/profile-actions'
import { getInitials } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface ProfileFormProps {
  userId: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  createdAt: string | null
}

export function ProfileForm({ userId, email, fullName, phone, avatarUrl, createdAt }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(fullName)
  const [phoneVal, setPhoneVal] = useState(phone ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setError(null)

    startTransition(async () => {
      const result = await updateMyProfileAction({
        full_name: name.trim(),
        phone: phoneVal.trim() || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-8">
      {/* Avatar + identity */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="w-16 h-16 rounded-full bg-[var(--color-admin-light)] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-[var(--color-admin)]">
              {getInitials(name || email)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-foreground)] truncate">{name || '—'}</p>
          <p className="text-sm text-[var(--color-muted-foreground)] truncate mt-0.5">{email}</p>
          {createdAt && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 flex items-center gap-1.5">
              <Calendar size={11} />
              Miembro desde {formatDate(createdAt)}
            </p>
          )}
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Información personal</h2>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Actualiza tu nombre y número de teléfono</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Email — readonly */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type="email"
                value={email}
                readOnly
                className={`${inputCls} pl-9 opacity-60 cursor-not-allowed`}
              />
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1">
              El correo no puede modificarse desde aquí
            </p>
          </div>

          {/* Full name */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nombre completo <span className="text-[var(--color-admin)]">*</span>
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tu nombre completo"
                disabled={isPending}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Teléfono
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type="tel"
                value={phoneVal}
                onChange={(e) => setPhoneVal(e.target.value)}
                placeholder="+506 8888-8888"
                disabled={isPending}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Perfil actualizado correctamente</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-muted)] flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
