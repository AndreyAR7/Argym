'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X, Loader2, AlertCircle,
  Play, Pause,
  SkipBack, SkipForward,
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
  if (!isFinite(secs) || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoPlayerModal({ title, storagePath, bucket = 'videos', onClose }: VideoPlayerModalProps) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const hideTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Use ref for scrubbing so callbacks don't capture stale state
  const scrubbingRef = useRef(false)

  const [videoUrl,     setVideoUrl]     = useState<string | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [playing,      setPlaying]      = useState(false)
  const [ended,        setEnded]        = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [fullscreen,   setFullscreen]   = useState(false)
  const [showControls, setShowControls] = useState(true)

  // ── Load signed URL ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadUrl() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 3600)
        if (error) throw error
        if (!cancelled) setVideoUrl(data.signedUrl)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'No se pudo cargar el video')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadUrl()
    return () => { cancelled = true }
  }, [storagePath, bucket])

  // ── Auto-play after URL loads (avoids autoPlay AbortError) ──────────────────
  useEffect(() => {
    if (!videoUrl) return
    const v = videoRef.current
    if (!v) return
    const p = v.play()
    // swallow AbortError caused by React strict-mode double-invoke
    if (p) p.catch(() => {})
  }, [videoUrl])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const v = videoRef.current
      if (e.key === 'Escape') { onClose(); return }
      if (!v) return
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); safeTogglePlay() }
      if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10) }
      if (e.key === 'm') toggleMute()
      if (e.key === 'f') toggleFullscreen()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fullscreen change listener ───────────────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFSChange)
    return () => document.removeEventListener('fullscreenchange', onFSChange)
  }, [])

  // ── Cleanup hide timer on unmount ────────────────────────────────────────────
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  // ── Auto-hide controls after 3 s of inactivity ──────────────────────────────
  function showAndResetTimer() {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!scrubbingRef.current) setShowControls(false)
    }, 3000)
  }

  // ── Playback helpers ─────────────────────────────────────────────────────────
  function safeTogglePlay() {
    const v = videoRef.current
    if (!v) return
    if (ended) { v.currentTime = 0; setEnded(false) }
    if (v.paused) {
      const p = v.play()
      if (p) p.catch(() => {})
    } else {
      v.pause()
    }
  }

  function skip(seconds: number) {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
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
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }

  function changeVolume(val: number) {
    const v = videoRef.current
    setVolume(val)
    if (v) { v.volume = val; v.muted = val === 0 }
    setMuted(val === 0)
  }

  // ── Progress bar scrubbing ───────────────────────────────────────────────────
  function getSeekRatio(clientX: number) {
    const bar = progressRef.current
    if (!bar) return 0
    const rect = bar.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  function onProgressMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return

    scrubbingRef.current = true
    v.currentTime = getSeekRatio(e.clientX) * v.duration

    function onMove(ev: MouseEvent) {
      if (!v || !isFinite(v.duration)) return
      v.currentTime = getSeekRatio(ev.clientX) * v.duration
    }
    function onUp() {
      scrubbingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const progress = duration > 0 ? currentTime / duration : 0
  const buffPct  = duration > 0 ? buffered    / duration : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-black">

        {/* ── Title bar ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111]">
          <p className="text-sm font-medium text-white/90 truncate">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Video + controls container ── */}
        <div
          ref={containerRef}
          className="relative aspect-video bg-black select-none overflow-hidden"
          onMouseMove={showAndResetTimer}
          onMouseEnter={showAndResetTimer}
          onMouseLeave={() => { if (!scrubbingRef.current && playing) setShowControls(false) }}
          onClick={safeTogglePlay}
        >
          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 z-10">
              <Loader2 size={40} className="animate-spin" />
              <span className="text-sm">Cargando video…</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 z-10">
              <AlertCircle size={40} />
              <span className="text-sm text-center px-8 max-w-sm">{error}</span>
            </div>
          )}

          {/* Video element — NO autoPlay to avoid AbortError */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              onClick={e => e.stopPropagation()}
              onPlay={()  => { setPlaying(true);  setEnded(false) }}
              onPause={()  => setPlaying(false)}
              onEnded={()  => { setPlaying(false); setEnded(true) }}
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

          {/* ── Overlay: big centre play icon when paused ── */}
          {videoUrl && !loading && !error && !playing && !ended && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-black/50 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <Play size={36} className="text-white ml-1.5" />
              </div>
            </div>
          )}

          {/* ── Overlay: replay when ended ── */}
          {ended && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 cursor-pointer z-10"
              onClick={e => { e.stopPropagation(); safeTogglePlay() }}
            >
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <RotateCcw size={32} className="text-white" />
              </div>
              <span className="text-sm text-white/80 font-medium">Reproducir de nuevo</span>
            </div>
          )}

          {/* ── Controls bar ── */}
          {videoUrl && !loading && !error && (
            <div
              className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300 ${
                showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div className="h-28 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-3">

                {/* ── Progress bar ── */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 tabular-nums w-10 text-right flex-shrink-0">
                    {formatTime(currentTime)}
                  </span>

                  <div
                    ref={progressRef}
                    className="relative flex-1 h-1 rounded-full bg-white/25 cursor-pointer group"
                    onMouseDown={onProgressMouseDown}
                  >
                    {/* Buffer */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-white/35 pointer-events-none"
                      style={{ width: `${buffPct * 100}%` }}
                    />
                    {/* Played */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-red-500 pointer-events-none"
                      style={{ width: `${progress * 100}%` }}
                    />
                    {/* Thumb — visible on hover / scrubbing */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg
                                 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ left: `calc(${progress * 100}% - 7px)` }}
                    />
                  </div>

                  <span className="text-xs text-white/50 tabular-nums w-10 flex-shrink-0">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* ── Buttons row ── */}
                <div className="flex items-center gap-1">

                  {/* Rewind 10 s */}
                  <button
                    onClick={() => skip(-10)}
                    title="Retroceder 10 s (←)"
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <SkipBack size={18} />
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={safeTogglePlay}
                    title={playing ? 'Pausar (k)' : 'Reproducir (k)'}
                    className="w-9 h-9 flex items-center justify-center text-white hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {playing ? <Pause size={20} /> : <Play size={20} />}
                  </button>

                  {/* Forward 10 s */}
                  <button
                    onClick={() => skip(10)}
                    title="Adelantar 10 s (→)"
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <SkipForward size={18} />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1 group/vol">
                    <button
                      onClick={toggleMute}
                      title="Silenciar (m)"
                      className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min={0} max={1} step={0.02}
                      value={muted ? 0 : volume}
                      onChange={e => changeVolume(parseFloat(e.target.value))}
                      onClick={e => e.stopPropagation()}
                      className="w-0 group-hover/vol:w-20 transition-[width] duration-200 accent-red-500 cursor-pointer overflow-hidden"
                    />
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    title="Pantalla completa (f)"
                    className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
