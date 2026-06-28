import { createClient } from '@/lib/supabase/server'
import { Dumbbell, Video, CalendarDays, Flame, TrendingUp, Play, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Inicio' }

function StatCard({
  label, value, icon, color, href,
}: {
  label: string; value: string | number; icon: React.ReactNode; color: string; href?: string
}) {
  const inner = (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '18', color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
        <p className="text-xs text-[var(--color-muted-foreground)] leading-tight">{label}</p>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function formatDuration(secs: number | null) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  return `${m} min`
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}

export default async function ClientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Streak: last 35 days
  const since35 = new Date(today)
  since35.setDate(today.getDate() - 34)

  const [
    { data: profile },
    { count: routineCount },
    { count: videoCount },
    { count: appointmentCount },
    { data: activeSub },
    { data: todayProgress },
    { data: recentProgress },
    { data: recentVideos },
    { data: activePromo },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('routine_assignments').select('id', { count: 'exact', head: true }).eq('client_id', user.id),
    supabase.from('video_assignments').select('id', { count: 'exact', head: true }).eq('client_id', user.id),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('client_id', user.id).eq('status', 'scheduled'),
    supabase.from('user_subscriptions').select('status, plans(name)').eq('user_id', user.id).eq('status', 'active').limit(1).single(),
    // today's exercise progress
    supabase.from('exercise_progress').select('exercise_id, completed').eq('client_id', user.id).eq('session_date', todayStr),
    // last 35 days for streak
    supabase.from('exercise_progress').select('session_date, completed').eq('client_id', user.id).gte('session_date', since35.toISOString().split('T')[0]).eq('completed', true),
    // recent videos
    supabase.from('video_assignments').select('id, note, videos(id, title, level, duration_seconds, thumbnail_color, video_storage_path, thumbnail_storage_path)').eq('client_id', user.id).order('assigned_at', { ascending: false }).limit(3),
    // active promotion for this user's plan
    supabase.from('promotions').select('id, title, description, end_date, discount_pct, discount_flat').eq('is_active', true).lte('start_date', todayStr).gte('end_date', todayStr).limit(1).single(),
  ])

  const planName = (activeSub as any)?.plans?.name

  // Streak calc
  const activeDatesSet = new Set(
    (recentProgress ?? []).map((r: any) => r.session_date as string)
  )
  let streak = 0
  const checkDate = new Date(today)
  while (activeDatesSet.has(checkDate.toISOString().split('T')[0])) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }
  // Check yesterday if today not active
  if (streak === 0) {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yd = new Date(yesterday)
    while (activeDatesSet.has(yd.toISOString().split('T')[0])) {
      streak++
      yd.setDate(yd.getDate() - 1)
    }
  }

  // Today's progress
  const todayRows = todayProgress ?? []
  const doneCount = todayRows.filter((r: any) => r.completed).length
  const totalCount = todayRows.length
  const todayPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const hasActivityToday = doneCount > 0

  // Videos
  const videos = (recentVideos ?? []).map((a: any) => ({ ...a.videos, note: a.note })).filter(Boolean)

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--color-foreground)]">
          Hola, {firstName} 👋
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          {planName ? `Plan activo: ${planName}` : 'Sin plan activo'}
        </p>
      </div>

      {/* Active promotion banner */}
      {(activePromo as any)?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <span className="text-xl">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">{(activePromo as any).title}</p>
            {(activePromo as any).description && (
              <p className="text-xs text-amber-700 mt-0.5">{(activePromo as any).description}</p>
            )}
            <p className="text-xs text-amber-600 mt-1">
              {(activePromo as any).discount_pct
                ? `${(activePromo as any).discount_pct}% de descuento`
                : (activePromo as any).discount_flat
                ? `₡${(activePromo as any).discount_flat} de descuento`
                : 'Promoción activa'}
              {' · '}Válido hasta {new Date((activePromo as any).end_date + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      )}

      {/* Today's progress + streak */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/client/routine"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Hoy</p>
            <Dumbbell size={14} style={{ color: 'var(--color-client)' }} />
          </div>
          <p className="text-3xl font-black" style={{ color: hasActivityToday ? 'var(--color-client)' : 'var(--color-foreground)' }}>
            {totalCount > 0 ? `${todayPct}%` : '—'}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {totalCount > 0 ? `${doneCount}/${totalCount} ejercicios` : 'Sin actividad aún'}
          </p>
          {totalCount > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${todayPct}%`, backgroundColor: 'var(--color-client)' }} />
            </div>
          )}
        </Link>

        <Link
          href="/client/progress"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">Racha</p>
            <Flame size={14} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500">{streak}🔥</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
            {streak === 0 ? 'Empieza hoy' : streak === 1 ? '1 día seguido' : `${streak} días seguidos`}
          </p>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Rutinas" value={routineCount ?? 0} icon={<Dumbbell size={16} />} color="var(--color-client)" href="/client/routine" />
        <StatCard label="Videos" value={videoCount ?? 0} icon={<Video size={16} />} color="#8b5cf6" href="/client/videos" />
        <StatCard label="Citas" value={appointmentCount ?? 0} icon={<CalendarDays size={16} />} color="var(--color-coach)" href="/client/appointments" />
      </div>

      {/* Featured videos */}
      {videos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[var(--color-foreground)]">Videos recientes</p>
            <Link href="/client/videos" className="text-xs font-medium flex items-center gap-0.5" style={{ color: 'var(--color-client)' }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {videos.map((v: any) => {
              const thumbUrl = v.thumbnail_storage_path
                ? `${supabaseUrl}/storage/v1/object/public/video-thumbnails/${v.thumbnail_storage_path}`
                : null
              return (
                <Link
                  key={v.id}
                  href="/client/videos"
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:shadow-sm transition-shadow"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ background: thumbUrl ? undefined : (v.thumbnail_color ?? '#8b5cf6') }}
                  >
                    {thumbUrl
                      ? <img src={thumbUrl} alt={v.title} className="w-full h-full object-cover" />
                      : <Play size={16} className="text-white/70" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-foreground)] line-clamp-1">{v.title}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {LEVEL_LABELS[v.level] ?? v.level}
                      {formatDuration(v.duration_seconds) ? ` · ${formatDuration(v.duration_seconds)}` : ''}
                    </p>
                  </div>
                  <Play size={14} className="flex-shrink-0 text-[var(--color-muted-foreground)]" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="text-sm font-bold text-[var(--color-foreground)] mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/client/routine', label: 'Mis rutinas', icon: '🏋️', color: 'var(--color-client)' },
            { href: '/client/progress', label: 'Mi progreso', icon: '📊', color: '#22c55e' },
            { href: '/client/videos', label: 'Mis videos', icon: '🎬', color: '#8b5cf6' },
            { href: '/client/appointments', label: 'Mis citas', icon: '📅', color: 'var(--color-coach)' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:shadow-sm transition-shadow"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold text-[var(--color-foreground)]">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
