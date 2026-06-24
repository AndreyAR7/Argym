'use client'

import { useRouter } from 'next/navigation'

interface VideoLevelSelectProps {
  currentLevel: string
  currentStatus: string
}

export function VideoLevelSelect({ currentLevel, currentStatus }: VideoLevelSelectProps) {
  const router = useRouter()

  function handleChange(level: string) {
    const sp = new URLSearchParams()
    if (currentStatus !== 'all') sp.set('status', currentStatus)
    if (level !== 'all') sp.set('level', level)
    const qs = sp.toString()
    router.push(`/admin/videos${qs ? `?${qs}` : ''}`)
  }

  return (
    <select
      value={currentLevel}
      onChange={(e) => handleChange(e.target.value)}
      className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-input)] bg-[var(--color-card)] text-[var(--color-foreground)] outline-none focus:border-[var(--color-ring)] cursor-pointer"
    >
      <option value="all">Todos los niveles</option>
      <option value="beginner">Principiante</option>
      <option value="intermediate">Intermedio</option>
      <option value="advanced">Avanzado</option>
    </select>
  )
}
