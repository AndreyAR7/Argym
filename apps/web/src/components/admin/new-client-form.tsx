'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Phone, Calendar, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { createClientAction } from '@/lib/admin/actions'
import Link from 'next/link'

export function NewClientForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputClass = 'w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors'
  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const full_name     = fd.get('full_name') as string
    const email         = fd.get('email') as string
    const password      = fd.get('password') as string
    const confirm       = fd.get('confirm_password') as string
    const phone         = (fd.get('phone') as string) || null
    const date_of_birth = (fd.get('date_of_birth') as string) || null

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    startTransition(async () => {
      const res = await createClientAction({ full_name, email, password, phone, date_of_birth })
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/admin/clients'), 1500)
      }
    })
  }

  return (
    <div className="mt-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <div
        className="rounded-2xl border p-6 md:p-8"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-client) 12%, transparent)' }}
            >
              <CheckCircle2 size={28} style={{ color: 'var(--color-client)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Cliente creado exitosamente
            </p>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Redirigiendo a la lista de clientes…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Nombre completo <span style={{ color: 'var(--color-destructive)' }}>*</span>
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="Ej. María Rodríguez"
                  className={`${inputClass} pl-9`}
                  style={inputStyle}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Correo electrónico <span style={{ color: 'var(--color-destructive)' }}>*</span>
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="cliente@ejemplo.com"
                  className={`${inputClass} pl-9`}
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone + DOB row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Teléfono <span className="font-normal" style={{ color: 'var(--color-muted-foreground)' }}>(opcional)</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+506 8888-8888"
                    className={`${inputClass} pl-9`}
                    style={inputStyle}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  Fecha de nacimiento <span className="font-normal" style={{ color: 'var(--color-muted-foreground)' }}>(opcional)</span>
                </label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                  <input
                    name="date_of_birth"
                    type="date"
                    className={`${inputClass} pl-9`}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="h-px" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Contraseña <span style={{ color: 'var(--color-destructive)' }}>*</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pl-9 pr-10`}
                  style={inputStyle}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                Confirmar contraseña <span style={{ color: 'var(--color-destructive)' }}>*</span>
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
                <input
                  name="confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repite la contraseña"
                  className={`${inputClass} pl-9`}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)',
                  color: 'var(--color-destructive)',
                }}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              El cliente quedará activo inmediatamente y podrá iniciar sesión con estas credenciales.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando…
                  </>
                ) : (
                  'Crear cliente'
                )}
              </button>
              <Link
                href="/admin/clients"
                className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
