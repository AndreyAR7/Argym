'use client'

import { useState, useTransition } from 'react'
import { Eye, Archive, RotateCcw, Pencil, Trash2, Play } from 'lucide-react'
import { updateVideoStatusAction } from '@/lib/admin/content-actions'
import { deleteVideoAction } from '@/lib/admin/video-actions'
import { VideoEditModal } from '@/components/admin/video-edit-modal'
import { VideoPlayerModal } from '@/components/admin/video-player-modal'

interface VideoRowActionsProps {
  video: {
    id: string
    title: string
    description: string | null
    level: string
    is_featured: boolean
    is_free: boolean
    status: string
    storage_path: string | null
  }
}

export function VideoRowActions({ video }: VideoRowActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(video.status)

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteVideoAction(video.id)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        setConfirmDelete(false)
      }
    })
  }

  function changeStatus(next: 'published' | 'archived' | 'draft') {
    setCurrentStatus(next)
    startTransition(async () => {
      const result = await updateVideoStatusAction(video.id, next)
      if (result?.error) setCurrentStatus(video.status)
    })
  }

  const statusButton = (() => {
    if (currentStatus === 'published') {
      return (
        <button
          onClick={() => changeStatus('archived')}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-40"
        >
          <Archive size={12} />
          {isPending ? '…' : 'Archivar'}
        </button>
      )
    }

    if (currentStatus === 'draft') {
      return (
        <button
          onClick={() => changeStatus('published')}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
        >
          <Eye size={12} />
          {isPending ? '…' : 'Publicar'}
        </button>
      )
    }

    if (currentStatus === 'archived') {
      return (
        <button
          onClick={() => changeStatus('draft')}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40"
        >
          <RotateCcw size={12} />
          {isPending ? '…' : 'Restaurar'}
        </button>
      )
    }

    return (
      <span className="text-xs text-[var(--color-muted-foreground)] italic">
        {currentStatus === 'uploading' ? 'Subiendo…'
          : currentStatus === 'processing' ? 'Procesando…'
          : currentStatus === 'failed' ? 'Error'
          : '—'}
      </span>
    )
  })()

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {video.storage_path && (
          <button
            onClick={() => setPlayerOpen(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-admin)]/30 bg-[var(--color-admin-light)] text-xs font-medium text-[var(--color-admin)] hover:opacity-80 transition-opacity disabled:opacity-40"
            title="Ver video"
          >
            <Play size={12} />
            Ver
          </button>
        )}

        <button
          onClick={() => setEditOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-40"
        >
          <Pencil size={12} />
          Editar
        </button>

        {statusButton}

        <button
          onClick={() => setConfirmDelete(true)}
          disabled={isPending}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          title="Eliminar video"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {editOpen && (
        <VideoEditModal
          video={video}
          onClose={() => setEditOpen(false)}
        />
      )}

      {playerOpen && video.storage_path && (
        <VideoPlayerModal
          title={video.title}
          storagePath={video.storage_path}
          onClose={() => setPlayerOpen(false)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-foreground)]">Eliminar video</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-foreground)]">
              ¿Estás seguro de que deseas eliminar <span className="font-semibold">{video.title}</span>?
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
