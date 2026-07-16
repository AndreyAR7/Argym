'use client'

import { useRef, useState } from 'react'
import {
  Upload,
  Camera,
  X,
  Film,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createVideoRecordAction } from '@/lib/admin/video-actions'
import { CameraRecorderModal } from '@/components/admin/camera-recorder-modal'

interface VideoUploadModalProps {
  tenantId: string
  onClose: () => void
}

type Level = 'beginner' | 'intermediate' | 'advanced'

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

type UploadState = 'idle' | 'uploading' | 'saving' | 'done' | 'error'

export function VideoUploadModal({ tenantId, onClose }: VideoUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<Level>('beginner')

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const [selectedThumb, setSelectedThumb] = useState<File | null>(null)
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null)

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleThumbChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setSelectedThumb(file)
    setThumbPreviewUrl(URL.createObjectURL(file))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setSelectedFile(file)
    setErrorMsg(null)
    // Pre-fill title from filename if empty
    if (!title) {
      const base = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(base)
    }
  }

  function handleCameraRecorded(file: File) {
    setSelectedFile(file)
    if (!title) {
      setTitle('Grabación ' + new Date().toLocaleDateString('es-CR'))
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setErrorMsg('Selecciona un archivo de video.')
      return
    }
    if (!title.trim()) {
      setErrorMsg('El titulo es obligatorio.')
      return
    }
    setErrorMsg(null)
    setUploadState('uploading')
    setProgress(0)

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        throw new Error('No hay sesion activa.')
      }

      const ext = selectedFile.name.split('.').pop() ?? 'mp4'
      const uuid = generateUUID()
      const storagePath = `${tenantId}/${uuid}.${ext}`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${storagePath}`

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress((e.loaded / e.total) * 100)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            let msg = `Error al subir el video (${xhr.status})`
            try {
              const body = JSON.parse(xhr.responseText)
              if (body?.message) msg = body.message
            } catch {
              // ignore parse error
            }
            reject(new Error(msg))
          }
        }

        xhr.onerror = () => reject(new Error('Error de red al subir el video.'))
        xhr.onabort = () => reject(new Error('Subida cancelada.'))

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'video/mp4')
        xhr.setRequestHeader('x-upsert', 'true')
        xhr.send(selectedFile)
      })

      setProgress(100)
      setUploadState('saving')

      let thumbStoragePath: string | null = null
      if (selectedThumb) {
        const thumbExt = selectedThumb.name.split('.').pop() ?? 'jpg'
        thumbStoragePath = `${tenantId}/${generateUUID()}-thumb.${thumbExt}`
        const { error: thumbError } = await supabase.storage
          .from('video-thumbnails')
          .upload(thumbStoragePath, selectedThumb, { upsert: true, contentType: selectedThumb.type || 'image/jpeg' })
        if (thumbError) throw thumbError
      }

      const result = await createVideoRecordAction({
        title: title.trim(),
        description: description.trim() || null,
        level,
        is_featured: false,
        is_free: false,
        storage_path: storagePath,
        storage_bucket: 'videos',
        thumbnail_storage_path: thumbStoragePath,
        thumbnail_bucket: thumbStoragePath ? 'video-thumbnails' : null,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setUploadState('done')
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setUploadState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido.')
    }
  }

  const isWorking = uploadState === 'uploading' || uploadState === 'saving'
  const isDone = uploadState === 'done'

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={isWorking ? undefined : onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-[480px] bg-[var(--color-card)] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Subir video
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
              Selecciona un archivo o graba desde la camara
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* File picker area */}
          {!selectedFile ? (
            <div className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center">
                <Film size={22} className="text-[var(--color-muted-foreground)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  Selecciona o graba un video
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  MP4, MOV, AVI — hasta 2 GB
                </p>
              </div>
              <div className="flex gap-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Upload size={14} />
                  Seleccionar archivo
                </button>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                >
                  <Camera size={14} />
                  Grabar
                </button>
              </div>
            </div>
          ) : (
            /* Selected file info */
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-admin)]/10 flex items-center justify-center shrink-0">
                <Film size={16} className="text-[var(--color-admin)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
              {!isWorking && !isDone && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    setProgress(0)
                    setUploadState('idle')
                    setErrorMsg(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Thumbnail picker (optional) */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Miniatura
              <span className="text-[var(--color-muted-foreground)] font-normal ml-1">(opcional)</span>
            </label>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbChange}
              disabled={isWorking || isDone}
            />
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              disabled={isWorking || isDone}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5 text-left hover:border-[var(--color-admin)] transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--color-admin)]/10 flex items-center justify-center shrink-0">
                {thumbPreviewUrl ? (
                  <img src={thumbPreviewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film size={14} className="text-[var(--color-admin)]" />
                )}
              </div>
              <p className="flex-1 text-sm text-[var(--color-foreground)] truncate">
                {selectedThumb ? selectedThumb.name : 'Seleccionar imagen'}
              </p>
              <span className="text-xs font-medium text-[var(--color-admin)]">
                {selectedThumb ? 'Cambiar' : 'Elegir'}
              </span>
            </button>
          </div>

          {/* Progress bar */}
          {(uploadState === 'uploading' || uploadState === 'saving' || uploadState === 'done') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                <span>
                  {uploadState === 'uploading'
                    ? 'Subiendo archivo…'
                    : uploadState === 'saving'
                      ? 'Guardando registro…'
                      : 'Completado'}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progress}%`,
                    background: isDone
                      ? 'oklch(72.3% 0.19 149.58)' /* emerald */
                      : 'var(--color-admin)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Success state */}
          {isDone && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">
                Video subido y guardado correctamente.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-foreground)] mb-1.5">
              Titulo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isWorking || isDone}
              placeholder="Ej. Sentadillas profundas"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isWorking || isDone}
              placeholder="Describe brevemente el video..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-admin)] focus:ring-2 focus:ring-[var(--color-admin)]/15 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={isWorking || isDone}
                  onClick={() => setLevel(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] space-y-3">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs text-red-700">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isWorking || isDone || !selectedFile}
              className="flex-1 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploadState === 'uploading' ? (
                <>
                  <Upload size={14} className="animate-bounce" />
                  Subiendo…
                </>
              ) : uploadState === 'saving' ? (
                'Guardando…'
              ) : isDone ? (
                <>
                  <CheckCircle2 size={14} />
                  Listo
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Subir video
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraRecorderModal
          onRecorded={handleCameraRecorded}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  )
}
