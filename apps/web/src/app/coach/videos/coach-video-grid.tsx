'use client'

import { useState } from 'react'
import { Play, Video } from 'lucide-react'
import { VideoPlayerModal } from '@/components/admin/video-player-modal'
import { Badge } from '@/components/ui/badge'
import { AssignVideoButton } from './assign-video-button'

interface VideoItem {
  id: string
  title: string
  description: string | null
  level: string | null
  status: string | null
  duration_seconds: number | null
  thumbnail_color: string | null
  thumbnail_storage_path: string | null
  video_storage_path: string | null
}

interface Props {
  videos: VideoItem[]
  supabaseUrl: string
}

function formatDuration(secs: number | null) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CoachVideoGrid({ videos, supabaseUrl }: Props) {
  const [playing, setPlaying] = useState<VideoItem | null>(null)

  return (
    <>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((video) => {
          const thumbUrl = video.thumbnail_storage_path
            ? `${supabaseUrl}/storage/v1/object/public/video-thumbnails/${video.thumbnail_storage_path}`
            : null

          return (
            <div
              key={video.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col"
            >
              {/* Thumbnail — clickable to play */}
              <button
                type="button"
                onClick={() => video.video_storage_path && setPlaying(video)}
                disabled={!video.video_storage_path}
                className="relative w-full aspect-video flex items-center justify-center overflow-hidden group disabled:cursor-not-allowed"
                style={{ background: thumbUrl ? undefined : (video.thumbnail_color ?? '#6C63FF') }}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <Video size={32} className="text-white/40" />
                )}
                {video.video_storage_path && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Play size={18} className="text-white fill-white translate-x-0.5" />
                    </div>
                  </div>
                )}
                {video.duration_seconds && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded tabular-nums">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
              </button>

              {/* Card body */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--color-foreground)] line-clamp-2 leading-snug flex-1">
                    {video.title}
                  </p>
                  {video.level && <Badge value={video.level} />}
                </div>

                {video.description && (
                  <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2">
                    {video.description}
                  </p>
                )}

                <div className="mt-auto pt-1">
                  <AssignVideoButton videoId={video.id} videoTitle={video.title} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {playing && playing.video_storage_path && (
        <VideoPlayerModal
          title={playing.title}
          storagePath={playing.video_storage_path}
          videoId={playing.id}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  )
}
