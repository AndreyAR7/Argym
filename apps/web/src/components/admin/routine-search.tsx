'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function RoutineSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const search = (fd.get('search') as string) ?? ''
    const sp = new URLSearchParams(searchParams.toString())
    if (search) sp.set('search', search)
    else sp.delete('search')
    startTransition(() => router.push(`/admin/routines?${sp.toString()}`))
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="search"
        type="search"
        defaultValue={defaultValue}
        placeholder="Buscar rutina..."
        className="max-w-xs w-full px-3.5 py-2 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/20"
      />
    </form>
  )
}
