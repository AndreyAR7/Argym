import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { ProgressClient } from '@/components/client/progress-client'

export const metadata = { title: 'Mi Progreso' }

// ─── Helpers ──────────────────────────────────────────────────

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] }
}

function computeStreaks(activeDates: string[]): { current: number; longest: number } {
  if (activeDates.length === 0) return { current: 0, longest: 0 }

  const sorted = [...new Set(activeDates)].sort()
  const dateSet = new Set(sorted)
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()

  let current = 0
  const startFrom = dateSet.has(todayStr) ? todayStr : dateSet.has(yesterdayStr) ? yesterdayStr : null
  if (startFrom) {
    const check = new Date(startFrom + 'T12:00:00')
    while (dateSet.has(check.toISOString().split('T')[0])) {
      current++
      check.setDate(check.getDate() - 1)
    }
  }

  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00')
    prev.setDate(prev.getDate() + 1)
    if (prev.toISOString().split('T')[0] === sorted[i]) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  return { current, longest }
}

// ─── Page ─────────────────────────────────────────────────────

export default async function ClientProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // 35 days ago for calendar (5 weeks)
  const since35 = new Date(today)
  since35.setDate(today.getDate() - 34)
  const since35Str = since35.toISOString().split('T')[0]

  // This week's bounds for measurement check
  const week = getWeekBounds(today)

  const [
    { data: measurements },
    { data: progressRows },
    { data: thisWeekRows },
  ] = await Promise.all([
    supabase
      .from('body_measurements')
      .select('id, measured_at, weight_kg, height_cm, body_fat_pct, waist_cm, notes')
      .eq('client_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(24),
    supabase
      .from('exercise_progress')
      .select('exercise_id, completed, session_date')
      .eq('client_id', user.id)
      .gte('session_date', since35Str)
      .lte('session_date', todayStr),
    supabase
      .from('body_measurements')
      .select('id, measured_at, weight_kg, height_cm, body_fat_pct, waist_cm, notes')
      .eq('client_id', user.id)
      .gte('measured_at', week.start)
      .lte('measured_at', week.end)
      .order('measured_at', { ascending: false })
      .limit(1),
  ])

  // Build daily progress map for last 35 days
  const byDate: Record<string, { completed: number; total: number }> = {}
  for (const row of progressRows ?? []) {
    const d = row.session_date
    if (!byDate[d]) byDate[d] = { completed: 0, total: 0 }
    byDate[d].total++
    if (row.completed) byDate[d].completed++
  }

  // Build dailyProgress array for last 14 days (for bar chart)
  const dailyProgress: { date: string; pct: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = byDate[dateStr]
    const pct = entry && entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0
    dailyProgress.push({ date: dateStr, pct })
  }

  // Active dates for streak: days with at least 1 completed exercise
  const activeDates = Object.entries(byDate)
    .filter(([, v]) => v.completed > 0)
    .map(([date]) => date)

  const streaks = computeStreaks(activeDates)

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Mi Progreso"
        subtitle="Seguimiento de tu evolución física y actividad"
      />
      <div className="mt-6">
        <ProgressClient
          measurements={measurements ?? []}
          dailyProgress={dailyProgress}
          streak={{
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            activeDates,
          }}
          thisWeekMeasurement={(thisWeekRows ?? [])[0] ?? null}
        />
      </div>
    </div>
  )
}
