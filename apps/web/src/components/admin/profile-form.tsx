'use client'

import { useState, useTransition, useRef } from 'react'
import { User, Mail, Phone, Calendar, CheckCircle2, AlertCircle, Loader2, Lock, Eye, EyeOff, ShieldCheck, Camera } from 'lucide-react'
import { updateMyProfileAction, updateMyAvatarAction } from '@/lib/admin/profile-actions'
import { changePasswordAction } from '@/lib/auth/actions'
import { getInitials } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const GENDER_OPTIONS = [
  { value: 'male',   label: '♂ Hombre' },
  { value: 'female', label: '♀ Mujer'  },
  { value: 'other',  label: '○ Prefiero no indicar' },
] as const

interface ProfileFormProps {
  userId: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  createdAt: string | null
  gender?: string | null
}

export function ProfileForm({ userId, email, fullName, phone, avatarUrl, createdAt, gender: genderProp }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(fullName)
  const [phoneVal, setPhoneVal] = useState(phone ?? '')
  const [genderVal, setGenderVal] = useState<string | null>(genderProp ?? null)

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Password change state
  const [pwPending, startPwTransition] = useTransition()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Solo se permiten imágenes'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('La imagen no puede superar 5 MB'); return }

    setAvatarError(null)
    setAvatarUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      const result = await updateMyAvatarAction(publicUrl)
      if (result.error) throw new Error(result.error)

      setAvatarPreview(publicUrl)
    } catch (err: any) {
      setAvatarError(err.message ?? 'No se pudo subir la imagen')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    setError(null)

    startTransition(async () => {
      const result = await updateMyProfileAction({
        full_name: name.trim(),
        phone: phoneVal.trim() || null,
        gender: genderVal,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (newPw.length < 8) { setPwError('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (newPw !== confirmPw) { setPwError('Las contraseñas no coinciden'); return }
    if (newPw === currentPw) { setPwError('La nueva contraseña debe ser diferente a la actual'); return }

    startPwTransition(async () => {
      const result = await changePasswordAction(currentPw, newPw)
      if (result.error) {
        setPwError(result.error)
      } else {
        setPwSuccess(true)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setPwSuccess(false), 4000)
      }
    })
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-input)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-8">
      {/* Avatar + identity */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {/* Clickable avatar with camera overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarUploading}
          className="relative w-16 h-16 rounded-full flex-shrink-0 group focus:outline-none focus:ring-2 focus:ring-[var(--color-admin)] focus:ring-offset-2"
          title="Cambiar foto"
        >
          <div className="w-full h-full rounded-full bg-[var(--color-admin-light)] flex items-center justify-center overflow-hidden">
            {avatarUploading ? (
              <Loader2 size={20} className="animate-spin text-[var(--color-admin)]" />
            ) : avatarPreview ? (
              <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-[var(--color-admin)]">
                {getInitials(name || email)}
              </span>
            )}
          </div>
          {!avatarUploading && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-foreground)] truncate">{name || '—'}</p>
          <p className="text-sm text-[var(--color-muted-foreground)] truncate mt-0.5">{email}</p>
          {createdAt && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 flex items-center gap-1.5">
              <Calendar size={11} />
              Miembro desde {formatDate(createdAt)}
            </p>
          )}
          {avatarError && (
            <p className="text-xs text-red-500 mt-1">{avatarError}</p>
          )}
          {!avatarUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[var(--color-admin)] hover:underline mt-1"
            >
              Cambiar foto
            </button>
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

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Género <span className="text-[var(--color-muted-foreground)] font-normal">(cambia la silueta en el asistente de medidas)</span>
            </label>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGenderVal(genderVal === opt.value ? null : opt.value)}
                  disabled={isPending}
                  className="flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all disabled:opacity-50"
                  style={
                    genderVal === opt.value
                      ? { backgroundColor: 'var(--color-admin)', borderColor: 'var(--color-admin)', color: '#fff' }
                      : { backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
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

      {/* ── Change password ── */}
      <form onSubmit={handlePasswordSubmit} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-muted)] flex items-center gap-2.5">
          <ShieldCheck size={15} className="text-[var(--color-muted-foreground)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Cambiar contraseña</h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Elige una contraseña segura de al menos 8 caracteres</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Contraseña actual</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                placeholder="Tu contraseña actual"
                disabled={pwPending}
                className={`${inputCls} pl-9 pr-10`}
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                disabled={pwPending}
                className={`${inputCls} pl-9 pr-10`}
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {[8, 12, 16].map((len) => (
                  <div key={len} className="h-1 flex-1 rounded-full transition-colors"
                    style={{ backgroundColor: newPw.length >= len ? newPw.length >= 16 ? '#22c55e' : newPw.length >= 12 ? '#f59e0b' : '#ef4444' : 'var(--color-muted)' }} />
                ))}
                <span className="text-[10px] text-[var(--color-muted-foreground)] ml-1">
                  {newPw.length >= 16 ? 'Fuerte' : newPw.length >= 12 ? 'Media' : 'Débil'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                minLength={8}
                placeholder="Repite la nueva contraseña"
                disabled={pwPending}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          {pwError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs text-red-700">{pwError}</p>
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">Contraseña actualizada correctamente</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-muted)] flex justify-end">
          <button
            type="submit"
            disabled={pwPending || !currentPw || !newPw || !confirmPw}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pwPending && <Loader2 size={14} className="animate-spin" />}
            {pwPending ? 'Actualizando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}
