'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Loader2, AlertCircle,
  Play, Pause,
  Volume2, VolumeX,
  Maximize, Minimize,
  RotateCcw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface VideoPlayerModalProps {
  title: string
  storagePath: string
  bucket?: string
  onClose: () => void
}

function formatTime(secs: number) {
  if (!isFinite(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoPlayerModal({ title, storagePath, bucket = 'videos', onClose }: VideoPlayerModalProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const hideTimeout   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [videoUrl,    setVideoUrl]    = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  // Playback state
  const [playing,     setPlaying]     = useState(false)
  const [ended,       setEnded]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [buffered,    setBuffered]    = useState(0)
  const [volume,      setVolume]      = useState(1)
  const [muted,       setMuted]       = useState(false)
  const [fullscreen,  setFullscreen]  = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [scrubbing,   setScrubbing]   = useState(false)

  // ── Load signed URL ──────────────────────────────────────────────────────────
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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const v = videoRef.current
      if (!v) return
      if (e.key === 'Escape')        { onClose(); return }
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowRight')    { e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 5) }
      if (e.key === 'ArrowLeft')     { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 5) }
      if (e.key === 'm')             { toggleMute() }
      if (e.key === 'f')             { toggleFullscreen() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // ── Fullscreen change listener ───────────────────────────────────────────────
  useEffect(() => {
    function onFSChange() {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  // ── Auto-hide controls ───────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
    hideTimeout.current = setTimeout(() => {
      if (!scrubbing) setShowControls(false)
    }, 3000)
  }, [scrubbing])

  useEffect(() => () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)
  }, [])

  // ── Playback helpers ─────────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (ended) { v.currentTime = 0; setEnded(false) }
    v.paused ? v.play() : v.pause()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen()
    else document.exitFullscreen()
  }

  // ── Progress bar scrubbing ───────────────────────────────────────────────────
  function seekTo(e: React.MouseEvent<HTMLDivElement> | MouseEvent) {
    const bar = progressRef.current
    const v   = videoRef.current
    if (!bar || !v || !isFinite(v.duration)) return
    const rect  = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = ratio * v.duration
    setCurrentTime(v.currentTime)
  }

  function onProgressMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setScrubbing(true)
    seekTo(e)

    function onMove(ev: MouseEvent) { seekTo(ev) }
    function onUp()   {
      setScrubbing(false)
      setShowControls(true)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  const progress  = duration > 0 ? currentTime / duration : 0
  const buffPct   = duration > 0 ? buffered    / duration : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {/* Modal wrapper */}
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-black">

        {/* ── Title bar ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <p className="text-sm font-medium text-white/90 truncate">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Video + controls container ── */}
        <div
          ref={containerRef}
          className="relative aspect-video bg-black select-none"
          onMouseMove={resetHideTimer}
          onMouseLeave={() => { if (!scrubbing) setShowControls(false) }}
          onMouseEnter={() => setShowControls(true)}
          onClick={togglePlay}
        >
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
              <Loader2 size={36} className="animate-spin" />
              <span className="text-sm">Cargando…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
              <AlertCircle size={36} />
              <span className="text-sm text-center px-8">{error}</span>
            </div>
          )}

          {/* Video element */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              autoPlay
              onClick={e => e.stopPropagation()}
              onPlay={()      => { setPlaying(true);  setEnded(false) }}
              onPause={()     => setPlaying(false)}
              onEnded={()     => { setPlaying(false); setEnded(true)  }}
              onTimeUpdate={() => {
                const v = videoRef.current
                if (!v) return
                setCurrentTime(v.currentTime)
                if (v.buffered.length > 0)
                  setBuffered(v.buffered.end(v.buffered.length - 1))
              }}
              onLoadedMetadata={() => {
                const v = videoRef.current
                if (v) setDuration(v.duration)
              }}
              onError={() => setError('Error al reproducir el video')}
            />
          )}

          {/* Centre play/pause flash */}
          {videoUrl && !loading && (
            <div
              className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-0' : 'opacity-0'}`}
            />
          )}

          {/* ── Controls overlay ── */}
          {videoUrl && !loading && !error && (
            <div
              className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div className="h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

              <div className="absolute inset-0 flex flex-col justify-end px-3 pb-3 gap-1.5">
                {/* Progress bar */}
                <div
                  ref={progressRef}
                  className="w-full h-1 rounded-full bg-white/20 cursor-pointer group relative"
                  style={{ height: '4px' }}
                  onMouseDown={onProgressMouseDown}
                >
                  {/* Buffered */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/30 pointer-events-none"
                    style={{ width: `${buffPct * 100}%` }}
                  />
                  {/* Played */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-red-500 pointer-events-none"
                    style={{ width: `${progress * 100}%` }}
                  />
                  {/* Thumb */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `calc(${progress * 100}% - 6px)` }}
                  />
                </div>

                {/* Bottom controls row */}
                <div className="flex items-center gap-2">
                  {/* Play / Pause / Replay */}
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                  >
                    {ended
                      ? <RotateCcw size={18} />
                      : playing
                        ? <Pause size={18} />
                        : <Play  size={18} />
                    }
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1.5 group/vol">
                    <button
                      onClick={toggleMute}
                      className="w-8 h-8 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                    >
                      {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range"
                      min={0} max={1} step={0.05}
                      value={muted ? 0 : volume}
                      onChange={e => {
                        const v = videoRef.current
                        const val = parseFloat(e.target.value)
                        setVolume(val)
                        if (v) { v.volume = val; v.muted = val === 0 }
                        setMuted(val === 0)
                      }}
                      className="w-0 group-hover/vol:w-20 transition-all duration-200 overflow-hidden accent-red-500 cursor-pointer"
                    />
                  </div>

                  {/* Time */}
                  <span className="text-xs text-white/80 tabular-nums ml-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                  >
                    {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Big play button when paused (not ended, not loading) */}
          {videoUrl && !loading && !error && !playing && !ended && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              onClick={e => { e.stopPropagation(); togglePlay() }}
            >
              <div className="w-16 h-16 rounded-full bg-black/50 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <Play size={28} className="text-white ml-1" />
              </div>
            </div>
          )}

          {/* Replay overlay */}
          {ended && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <RotateCcw size={24} className="text-white" />
              </div>
              <span className="text-sm text-white/80">Reproducir de nuevo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
