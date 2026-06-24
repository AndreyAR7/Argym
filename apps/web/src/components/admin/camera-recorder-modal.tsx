'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Video, Square, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'

interface CameraRecorderModalProps {
  onRecorded: (file: File) => void
  onClose: () => void
}

type RecordState = 'idle' | 'recording' | 'preview' | 'error'

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function CameraRecorderModal({ onRecorded, onClose }: CameraRecorderModalProps) {
  const liveRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [state, setState] = useState<RecordState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopStream()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (liveRef.current) {
        liveRef.current.srcObject = stream
        liveRef.current.play()
      }
    } catch (e: any) {
      setError(e.name === 'NotAllowedError'
        ? 'Acceso a cámara denegado. Habilita el permiso en el navegador.'
        : 'No se pudo acceder a la cámara: ' + e.message)
      setState('error')
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    setElapsed(0)

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setRecordedBlob(blob)
      setPreviewUrl(url)
      setState('preview')
      stopStream()
      if (previewRef.current) {
        previewRef.current.src = url
        previewRef.current.play()
      }
    }

    recorder.start(250)
    setState('recording')

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1000)
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recorderRef.current?.stop()
  }

  function useRecording() {
    if (!recordedBlob) return
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([recordedBlob], `grabacion.${ext}`, { type: recordedBlob.type })
    onRecorded(file)
    onClose()
  }

  function retake() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setRecordedBlob(null)
    setElapsed(0)
    setState('idle')
    startCamera()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-foreground)]">Grabar video</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera / preview */}
        <div className="bg-black aspect-video relative flex items-center justify-center">
          {/* Live preview */}
          <video
            ref={liveRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${state === 'preview' || state === 'error' ? 'hidden' : ''}`}
          />
          {/* Recorded preview */}
          <video
            ref={previewRef}
            controls
            playsInline
            className={`w-full h-full object-cover ${state !== 'preview' ? 'hidden' : ''}`}
          />
          {/* Recording badge */}
          {state === 'recording' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs font-mono">{formatTime(elapsed)}</span>
            </div>
          )}
          {/* Error state */}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 text-white/60 px-6 text-center">
              <AlertCircle size={32} />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 flex items-center justify-center gap-3">
          {state === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Video size={16} />
              Iniciar grabación
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Square size={14} />
              Detener
            </button>
          )}

          {state === 'preview' && (
            <>
              <button
                onClick={retake}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <RotateCcw size={14} />
                Repetir
              </button>
              <button
                onClick={useRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-admin)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <CheckCircle2 size={14} />
                Usar este video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
