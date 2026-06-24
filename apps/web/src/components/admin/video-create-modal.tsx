'use client'

import { useState, useTransition } from 'react'
import { X, Info } from 'lucide-react'
import { createVideoAction } from '@/lib/admin/video-actions'

interface VideoCreateModalProps {
  onClose: () => void
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
] as const

export function VideoCreateModal({ onClose }: VideoCreateModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isFree, setIsFree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createVideoAction({
        title: title.trim(),
        description: description.trim() || null,
        level,
        is_featured: isFeatured,
        is_free: isFree,
        category_id: null,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onClose(), 700)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-[440px] bg-[var(--color-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Nuevo video
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Registra los metadatos del video
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info box */}
          <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
            <p className="text-xs text-blue-700 leading-relaxed">
              El archivo de video se gestiona desde la app movil o directamente en el panel de Supabase.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Titulo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Sentadillas profundas"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el video..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none"
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Nivel
            </label>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLevel(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    level === opt.value
                      ? 'border-[var(--color-admin)] bg-[var(--color-admin-light)] text-[var(--color-admin)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-ring)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {/* Is Featured */}
            <label className="flex items-center justify-between gap-3 cursor-pointer group">
              <span className="text-sm text-[var(--color-foreground)]">
                Video destacado
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isFeatured}
                onClick={() => setIsFeatured((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                  isFeatured ? 'bg-[var(--color-admin)]' : 'bg-[var(--color-input)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isFeatured ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {/* Is Free */}
            <label className="flex items-center justify-between gap-3 cursor-pointer group">
              <span className="text-sm text-[var(--color-foreground)]">
                Disponible gratis
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isFree}
                onClick={() => setIsFree((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                  isFree ? 'bg-[var(--color-admin)]' : 'bg-[var(--color-input)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isFree ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-3">
          {success && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Video creado correctamente.
            </p>
          )}
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || success}
              className="flex-1 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Creando…' : 'Crear video'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
