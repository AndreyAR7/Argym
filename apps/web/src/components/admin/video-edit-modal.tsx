'use client'

import { useRef, useState, useTransition } from 'react'
import { X, Upload, Film, Image as ImageIcon } from 'lucide-react'
import { updateVideoMetadataAction, updateVideoFileAction, updateVideoThumbnailAction } from '@/lib/admin/video-actions'
import { createClient } from '@/lib/supabase/client'

interface VideoEditModalProps {
  video: {
    id: string
    title: string
    description: string | null
    level: string
    is_featured: boolean
    is_free: boolean
    status: string
    storage_path?: string | null
    thumbnail_storage_path?: string | null
    updated_at?: string | null
  }
  tenantId: string
  onClose: () => void
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
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

export function VideoEditModal({ video, tenantId, onClose }: VideoEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description ?? '')
  const [level, setLevel] = useState(video.level)
  const [status, setStatus] = useState(video.status)
  const [isFeatured, setIsFeatured] = useState(video.is_featured)
  const [isFree, setIsFree] = useState(video.is_free)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadPct, setUploadPct] = useState<number | null>(null)

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [selectedThumb, setSelectedThumb] = useState<File | null>(null)
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) setSelectedFile(file)
  }

  function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setSelectedThumb(file)
    setThumbPreviewUrl(URL.createObjectURL(file))
  }

  async function uploadSelectedThumb(): Promise<{ storage_path: string; storage_bucket: string } | null> {
    if (!selectedThumb) return null
    const supabase = createClient()
    const ext = selectedThumb.name.split('.').pop() ?? 'jpg'
    const storagePath = `${tenantId}/${video.id}/thumb.${ext}`
    const { error } = await supabase.storage
      .from('video-thumbnails')
      .upload(storagePath, selectedThumb, { upsert: true, contentType: selectedThumb.type || 'image/jpeg' })
    if (error) throw error
    return { storage_path: storagePath, storage_bucket: 'video-thumbnails' }
  }

  async function uploadSelectedFile(): Promise<{ storage_path: string; storage_bucket: string } | null> {
    if (!selectedFile) return null
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('No hay sesión activa.')

    const ext = selectedFile.name.split('.').pop() ?? 'mp4'
    const storagePath = `${tenantId}/${generateUUID()}.${ext}`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${storagePath}`

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadPct((e.loaded / e.total) * 100)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Error al subir el video (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Error de red al subir el video.'))
      xhr.open('POST', uploadUrl)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Content-Type', selectedFile.type || 'video/mp4')
      xhr.setRequestHeader('x-upsert', 'true')
      xhr.send(selectedFile)
    })

    return { storage_path: storagePath, storage_bucket: 'videos' }
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        if (selectedFile) {
          setUploadPct(0)
          const uploaded = await uploadSelectedFile()
          if (uploaded) {
            const fileResult = await updateVideoFileAction(video.id, {
              storage_path: uploaded.storage_path,
              storage_bucket: uploaded.storage_bucket,
              previous_path: video.storage_path ?? null,
            })
            if (fileResult?.error) { setError(fileResult.error); return }
          }
        }

        if (selectedThumb) {
          const uploadedThumb = await uploadSelectedThumb()
          if (uploadedThumb) {
            const thumbResult = await updateVideoThumbnailAction(video.id, {
              storage_path: uploadedThumb.storage_path,
              storage_bucket: uploadedThumb.storage_bucket,
              previous_path: video.thumbnail_storage_path ?? null,
            })
            if (thumbResult?.error) { setError(thumbResult.error); return }
          }
        }

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido.')
      } finally {
        setUploadPct(null)
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
          {/* Video file */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Archivo de video
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-left hover:border-[var(--color-admin)] transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-admin)]/10 flex items-center justify-center shrink-0">
                <Film size={16} className="text-[var(--color-admin)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                  {selectedFile
                    ? selectedFile.name
                    : video.storage_path
                      ? 'Video ya cargado'
                      : 'Sin video'}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {selectedFile ? formatBytes(selectedFile.size) : 'Toca para ' + (video.storage_path ? 'reemplazar' : 'agregar')}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-admin)]">
                <Upload size={12} />
                {video.storage_path || selectedFile ? 'Cambiar' : 'Elegir'}
              </span>
            </button>
            {uploadPct !== null && (
              <div className="mt-2 space-y-1">
                <div className="w-full h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-admin)] transition-all duration-200"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">Subiendo video… {Math.round(uploadPct)}%</p>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Miniatura
              <span className="text-[var(--color-muted-foreground)] font-normal ml-1">(imagen previa antes de reproducir)</span>
            </label>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbChange}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              disabled={isPending}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-left hover:border-[var(--color-admin)] transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--color-admin)]/10 flex items-center justify-center shrink-0">
                {thumbPreviewUrl ? (
                  <img src={thumbPreviewUrl} alt="" className="w-full h-full object-cover" />
                ) : video.thumbnail_storage_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/video-thumbnails/${video.thumbnail_storage_path}?v=${video.updated_at ? new Date(video.updated_at).getTime() : 0}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={16} className="text-[var(--color-admin)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                  {selectedThumb
                    ? selectedThumb.name
                    : video.thumbnail_storage_path
                      ? 'Miniatura ya cargada'
                      : 'Sin miniatura'}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-admin)]">
                <Upload size={12} />
                {video.thumbnail_storage_path || selectedThumb ? 'Cambiar' : 'Elegir'}
              </span>
            </button>
          </div>

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
