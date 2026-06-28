'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { CoachClientsModal } from './coach-clients-modal'

interface Props {
  coach: { id: string; full_name: string | null }
}

export function ManageCoachClientsButton({ coach }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Gestionar clientes"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-coach) 10%, transparent)',
          color: 'var(--color-coach)',
        }}
      >
        <Users size={13} />
        Clientes
      </button>

      {open && (
        <CoachClientsModal coach={coach} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
