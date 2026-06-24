'use client'

import { useState, useTransition } from 'react'
import { toggleRoutineActiveAction } from '@/lib/admin/content-actions'

export function RoutineToggle({ routineId, isActive }: { routineId: string; isActive: boolean }) {
  const [active, setActive] = useState(isActive)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleRoutineActiveAction(routineId, !active)
      if (!result?.error) setActive(!active)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        active ? 'bg-[var(--color-coach)]' : 'bg-[var(--color-border)]'
      }`}
      role="switch"
      aria-checked={active}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          active ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
