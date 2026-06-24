'use client'

import { useState } from 'react'
import { Play, Video, Clock } from 'lucide-react'
import { VideoPlayerModal } from '@/components/admin/video-player-modal'

interface VideoItem {
  id: string
  title: string
  description: string | null
  level: string
  duration_seconds: number | null
  storage_path: string | null
  thumbnail_storage_path: string | null
  thumbnail_color: string | null
  note: string | null
}

interface Props {
  videos: VideoItem[]
  supabaseUrl: string
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

function formatDuration(secs: number | null) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ClientVideoList({ videos, supabaseUrl }: Props) {
  const [playing, setPlaying] = useState<VideoItem | null>(null)

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-muted)] flex items-center justify-center mx-auto mb-3">
          <Video size={20} className="text-[var(--color-border)]" />
        </div>
        <p className="text-sm font-medium text-[var(--color-foreground)]">Sin videos disponibles</p>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
          Tu coach te asignará videos de entrenamiento pronto.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => {
          const thumbUrl = video.thumbnail_storage_path
            ? `${supabaseUrl}/storage/v1/object/public/video-thumbnails/${video.thumbnail_storage_path}`
            : null
          const duration = formatDuration(video.duration_seconds)

          return (
            <button
              key={video.id}
              onClick={() => video.storage_path && setPlaying(video)}
              disabled={!video.storage_path}
              className="text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden hover:border-[var(--color-client)]/40 hover:shadow-md transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* Thumbnail */}
              <div
                className="aspect-video relative flex items-center justify-center overflow-hidden"
                style={{ background: thumbUrl ? undefined : (video.thumbnail_color ?? '#6C63FF') }}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <Video size={32} className="text-white/50" />
                )}
                {video.storage_path && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play size={20} className="text-white ml-0.5" />
                    </div>
                  </div>
                )}
                {duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Clock size={9} />
                    {duration}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="font-medium text-sm text-[var(--color-foreground)] line-clamp-1">{video.title}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{LEVEL_LABELS[video.level] ?? video.level}</p>
                {video.note && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1 italic line-clamp-2">"{video.note}"</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {playing && playing.storage_path && (
        <VideoPlayerModal
          title={playing.title}
          storagePath={playing.storage_path}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  )
}
