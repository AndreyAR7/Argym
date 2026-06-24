'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { updateVideoMetadataAction } from '@/lib/admin/video-actions'

interface VideoEditModalProps {
  video: {
    id: string
    title: string
    description: string | null
    level: string
    is_featured: boolean
    is_free: boolean
    status: string
  }
  onClose: () => void
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
] as const

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
] as const

export function VideoEditModal({ video, onClose }: VideoEditModalProps) {
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description ?? '')
  const [level, setLevel] = useState(video.level)
  const [status, setStatus] = useState(video.status)
  const [isFeatured, setIsFeatured] = useState(video.is_featured)
  const [isFree, setIsFree] = useState(video.is_free)
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
      const result = await updateVideoMetadataAction(video.id, {
        title: title.trim(),
        description: description.trim(),
        level,
        is_featured: isFeatured,
        is_free: isFree,
        status: status as 'draft' | 'published' | 'archived',
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => onClose(), 800)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-96 bg-[var(--color-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Editar video
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Modifica los metadatos del video
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
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Título <span className="text-red-500">*</span>
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
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el video..."
              rows={3}
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

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Estado
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    status === opt.value
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
              <span className="text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-foreground)]">
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
              <span className="text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-foreground)]">
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
              Cambios guardados correctamente.
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
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
