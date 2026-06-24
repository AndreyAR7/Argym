'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { VideoUploadModal } from '@/components/admin/video-upload-modal'

interface NewVideoButtonProps {
  tenantId: string
}

export function NewVideoButton({ tenantId }: NewVideoButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium bg-[var(--color-admin)] text-white hover:opacity-90 transition-opacity"
      >
        <Plus size={16} />
        Nuevo video
      </button>

      {open && (
        <VideoUploadModal tenantId={tenantId} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
