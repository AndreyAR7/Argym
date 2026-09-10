'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

interface Props {
  token:      string
  email:      string
  fullName:   string
  status:     string
  tenantName: string
  tenantSlug: string
}

export function InviteLanding({ email, fullName, status, tenantName, tenantSlug }: Props) {
  if (status === 'accepted') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-admin) 12%, transparent)' }}>
          <CheckCircle2 size={28} style={{ color: 'var(--color-admin)' }} />
        </div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Esta invitación ya fue usada
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Si ya tienes cuenta con {email}, inicia sesión normalmente.
        </p>
        <Link
          href="/login"
          className="mt-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  const registerHref = `/register/${tenantSlug}?email=${encodeURIComponent(email)}&full_name=${encodeURIComponent(fullName)}`
  const googleHref = `/auth/google?slug=${encodeURIComponent(tenantSlug)}`

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
          ¡Fuiste invitado a {tenantName}!
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Creá tu cuenta con <strong>{email}</strong> y tu acceso queda activo de inmediato — sin esperar aprobación.
        </p>
      </div>

      <a href={googleHref} className="block w-full">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:bg-[var(--color-muted)]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </a>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-muted-foreground)' }}>
            o con correo y contraseña
          </span>
        </div>
      </div>

      <Link
        href={registerHref}
        className="w-full flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
      >
        Crear cuenta con correo
      </Link>

      <p className="mt-6 text-xs text-center" style={{ color: 'var(--color-muted-foreground)' }}>
        Usa {email} en cualquiera de las dos opciones para que tu cuenta quede activa sin revisión.
      </p>
    </div>
  )
}
