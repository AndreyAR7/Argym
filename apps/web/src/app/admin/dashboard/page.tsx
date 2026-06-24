import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrency } from '@/lib/utils'
import {
  Users, CreditCard, TrendingUp, Clock,
  ArrowRight, AlertTriangle, CheckCircle2, CalendarDays,
} from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getSessionData()
  const { supabase, tenantId, profile } = session!

  // ── Date boundaries (computed once) ──
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const weekFromNow = new Date(Date.now() + 7 * 864e5).toISOString()

  // ── All queries in a single parallel block ──
  const _tq = Date.now()
  const [
    { count: approvedClients },
    { count: pendingApprovals },
    { count: activeSubscriptions },
    { count: expiringSoon },
    { data: pendingUsers },
    { data: todayAppointments },
    { data: monthlyRevenue },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .eq('is_active', true),

    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending'),

    supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),

    supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .lte('end_date', weekFromNow),

    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, created_at')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(6),

    supabase
      .from('appointments')
      .select('id, title, start_time, end_time, status, client_id, coach_id')
      .eq('tenant_id', tenantId)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time', { ascending: true })
      .limit(6),

    supabase
      .from('user_subscriptions')
      .select('final_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('created_at', monthStart.toISOString()),
  ])
  console.log(`[DASHBOARD] 7 parallel queries: ${Date.now() - _tq}ms`)

  const totalRevenueCRC = monthlyRevenue
    ?.reduce((acc, s) => acc + (s.final_price ?? 0), 0) ?? 0

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-4 md:p-8 max-w-[1400px]">
      {/* ── Page title ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)] tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Alert banners ── */}
      {((pendingApprovals ?? 0) > 0 || (expiringSoon ?? 0) > 0) && (
        <div className="mb-6 space-y-2">
          {(pendingApprovals ?? 0) > 0 && (
            <Link
              href="/admin/approvals"
              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <strong className="font-semibold">{pendingApprovals}</strong>
                {(pendingApprovals ?? 0) === 1 ? ' usuario pendiente de aprobación' : ' usuarios pendientes de aprobación'}
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-medium flex-shrink-0">
                Revisar <ArrowRight size={13} />
              </span>
            </Link>
          )}
          {(expiringSoon ?? 0) > 0 && (
            <Link
              href="/admin/billing"
              className="flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 hover:bg-orange-100 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Clock size={15} className="text-orange-600 flex-shrink-0" />
                <strong className="font-semibold">{expiringSoon}</strong>
                {(expiringSoon ?? 0) === 1 ? ' suscripción vence esta semana' : ' suscripciones vencen esta semana'}
              </span>
              <span className="flex items-center gap-1 text-orange-700 font-medium flex-shrink-0">
                Ver <ArrowRight size={13} />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Clientes activos"
          value={approvedClients ?? 0}
          icon={<Users size={16} />}
          color="violet"
          href="/admin/clients"
        />
        <KpiCard
          label="Revenue este mes"
          value={formatCurrency(totalRevenueCRC)}
          icon={<TrendingUp size={16} />}
          color="emerald"
          href="/admin/billing"
        />
        <KpiCard
          label="Suscripciones activas"
          value={activeSubscriptions ?? 0}
          icon={<CreditCard size={16} />}
          color="blue"
          href="/admin/billing"
        />
        <KpiCard
          label="Citas hoy"
          value={todayAppointments?.length ?? 0}
          icon={<CalendarDays size={16} />}
          color="amber"
          href="/admin/appointments"
        />
      </div>

      {/* ── Main content: two columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Pending approvals ── */}
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Pendientes de aprobación
              </h2>
              {(pendingApprovals ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {pendingApprovals}
                </span>
              )}
            </div>
            <Link
              href="/admin/approvals"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {pendingUsers && pendingUsers.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {pendingUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--color-muted)] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.full_name ?? '?'} src={u.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                        {u.full_name ?? 'Sin nombre'}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Hace {daysSince(u.created_at)}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/approvals"
                    className="flex-shrink-0 text-xs font-medium text-[var(--color-admin)] hover:underline underline-offset-4"
                  >
                    Revisar
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CheckCircle2 size={24} className="text-emerald-500" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No hay solicitudes pendientes
              </p>
            </div>
          )}
        </div>

        {/* ── Today's appointments ── */}
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              Citas de hoy
            </h2>
            <Link
              href="/admin/appointments"
              className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {todayAppointments && todayAppointments.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {todayAppointments.map((apt) => (
                <li key={apt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-muted)] transition-colors">
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-semibold text-[var(--color-foreground)] tabular-nums">
                      {formatTime(apt.start_time)}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums">
                      {formatTime(apt.end_time)}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-[var(--color-border)] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-foreground)] truncate">
                      {apt.title}
                    </p>
                  </div>
                  <Badge value={apt.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CalendarDays size={24} className="text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Sin citas programadas para hoy
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: 'violet' | 'emerald' | 'blue' | 'amber'
  href: string
}

const colorMap = {
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
}

function KpiCard({ label, value, icon, color, href }: KpiCardProps) {
  const c = colorMap[color]
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 transition-all hover:shadow-sm hover:border-[var(--color-ring)]/25 block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)] truncate">
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${c.bg} ${c.border} border`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Helpers ────────────────────────────────────────────────────

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 864e5)
  if (days === 0) return 'hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-CR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
