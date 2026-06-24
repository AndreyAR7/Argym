'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, AlertCircle, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface VideoPlayerModalProps {
  title: string
  storagePath: string
  bucket?: string
  onClose: () => void
}

export function VideoPlayerModal({ title, storagePath, bucket = 'videos', onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUrl() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 3600)
        if (error) throw error
        setVideoUrl(data.signedUrl)
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar el video')
      } finally {
        setLoading(false)
      }
    }
    loadUrl()
  }, [storagePath, bucket])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Play size={16} className="text-[var(--color-admin)] flex-shrink-0" />
            <h2 className="font-semibold text-[var(--color-foreground)] truncate">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* Video area */}
        <div className="bg-black aspect-video flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-white/60">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Cargando video…</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 text-white/60">
              <AlertCircle size={28} />
              <span className="text-sm text-center px-6">{error}</span>
            </div>
          )}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full"
              onError={() => setError('Error al reproducir el video')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
