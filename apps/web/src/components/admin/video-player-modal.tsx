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

  // ── Signed URL ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from(bucket).createSignedUrl(storagePath, 3600)
        if (error) throw error
        if (!cancelled) setVideoUrl(data.signedUrl)
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'No se pudo cargar el video')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [storagePath, bucket])

  // ── Auto-play after URL loads (avoids autoPlay AbortError) ─────────────────
  useEffect(() => {
    if (!videoUrl) return
    const v = videoRef.current
    if (!v) return
    const p = v.play()
    if (p) p.catch(() => {})
  }, [videoUrl])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      const v = videoRef.current
      if (!v) return
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); safeTogglePlay() }
      if (e.key === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10) }
      if (e.key === 'm') { e.preventDefault(); toggleMute() }
      if (e.key === 'f') { e.preventDefault(); toggleFullscreen() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fullscreen listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  // ── Cleanup hide timer ──────────────────────────────────────────────────────
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  // ── Auto-hide controls ──────────────────────────────────────────────────────
  function wakeControls() {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!scrubbingRef.current) setShowControls(false)
    }, 3000)
  }

  // ── Playback helpers ────────────────────────────────────────────────────────
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

  function skip(s: number) {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + s))
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

  // ── Progress scrubbing ──────────────────────────────────────────────────────
  function getRatio(clientX: number) {
    const bar = progressRef.current
    if (!bar) return 0
    const r = bar.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  function onProgressPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return
    scrubbingRef.current = true
    ;(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
    v.currentTime = getRatio(e.clientX) * v.duration
  }

  function onProgressPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return
    v.currentTime = getRatio(e.clientX) * v.duration
  }

  function onProgressPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    ;(e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
  }

  const progress = duration > 0 ? currentTime / duration : 0
  const buffPct  = duration > 0 ? buffered    / duration : 0
  const ctrlVisible = showControls || !playing

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ padding: '1rem' }}
    >
      {/* ── Modal card — max height = viewport minus padding ── */}
      <div
        className="w-full max-w-4xl flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* ── Title bar ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#111] border-b border-white/10">
          <p className="text-sm font-medium text-white/90 truncate pr-3">{title}</p>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Video area — fills remaining space, never overflows ── */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 bg-black select-none"
          style={{ aspectRatio: '16/9', maxHeight: 'calc(100vh - 6rem)' }}
          onMouseMove={wakeControls}
          onMouseEnter={wakeControls}
          onMouseLeave={() => { if (!scrubbingRef.current && playing) setShowControls(false) }}
          onClick={safeTogglePlay}
        >
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50 z-10">
              <Loader2 size={40} className="animate-spin" />
              <span className="text-sm">Cargando video…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60 z-10 px-8 text-center">
              <AlertCircle size={40} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Video element */}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full"
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

          {/* Centre play icon (paused, not ended) */}
          {videoUrl && !loading && !error && !playing && !ended && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-20 h-20 rounded-full bg-black/60 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <Play size={36} className="text-white ml-1.5" />
              </div>
            </div>
          )}

          {/* Replay overlay (ended) */}
          {ended && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 cursor-pointer z-10"
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
              className="absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300"
              style={{ opacity: ctrlVisible ? 1 : 0, pointerEvents: ctrlVisible ? 'auto' : 'none' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div
                className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{
                  height: '130px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                }}
              />

              {/* Controls content — sits on top of scrim */}
              <div className="relative z-10 flex flex-col gap-2 px-4 pb-3 pt-8">

                {/* ── Progress row ── */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 tabular-nums w-9 text-right flex-shrink-0">
                    {formatTime(currentTime)}
                  </span>

                  {/* Scrubber — pointer events for touch+mouse */}
                  <div
                    ref={progressRef}
                    className="relative flex-1 cursor-pointer group"
                    style={{ height: '18px', display: 'flex', alignItems: 'center' }}
                    onPointerDown={onProgressPointerDown}
                    onPointerMove={onProgressPointerMove}
                    onPointerUp={onProgressPointerUp}
                  >
                    {/* Track */}
                    <div className="absolute inset-x-0 rounded-full bg-white/25 group-hover:bg-white/30 transition-colors" style={{ height: '4px' }}>
                      {/* Buffer */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                        style={{ width: `${buffPct * 100}%` }}
                      />
                      {/* Played */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-red-500"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    {/* Thumb */}
                    <div
                      className="absolute w-3.5 h-3.5 rounded-full bg-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity -translate-y-px pointer-events-none"
                      style={{ left: `calc(${progress * 100}% - 7px)` }}
                    />
                  </div>

                  <span className="text-xs text-white/50 tabular-nums w-9 flex-shrink-0">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* ── Buttons row ── */}
                <div className="flex items-center gap-0.5">

                  {/* Rewind 10 s */}
                  <button
                    onClick={() => skip(-10)}
                    title="Retroceder 10 s  (←)"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <SkipBack size={18} />
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={safeTogglePlay}
                    title={playing ? 'Pausar  (Space)' : 'Reproducir  (Space)'}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors"
                  >
                    {playing ? <Pause size={22} /> : <Play size={22} />}
                  </button>

                  {/* Forward 10 s */}
                  <button
                    onClick={() => skip(10)}
                    title="Adelantar 10 s  (→)"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <SkipForward size={18} />
                  </button>

                  {/* Volume group */}
                  <div className="flex items-center group/vol ml-1">
                    <button
                      onClick={toggleMute}
                      title="Silenciar  (m)"
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    {/* Slider expands on hover */}
                    <div className="overflow-hidden transition-all duration-200 w-0 group-hover/vol:w-24">
                      <input
                        type="range"
                        min={0} max={1} step={0.02}
                        value={muted ? 0 : volume}
                        onChange={e => changeVolume(parseFloat(e.target.value))}
                        onClick={e => e.stopPropagation()}
                        className="w-24 accent-red-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    title="Pantalla completa  (f)"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
