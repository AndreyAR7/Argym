import { createClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { ArrowLeft, Circle, Users, UserCheck, Dumbbell, Calendar } from 'lucide-react'
import { TenantToggleButton } from './tenant-toggle-button'
import { PlatformSubscriptionForm } from './platform-subscription-form'
import { BrandingForm } from './branding-form'

export const metadata = { title: 'Detalle de gimnasio — ARGYM HQ' }

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: tenantId } = await params

  const session = await getSessionData()
  if (!session) redirect('/login')
  if (!session.isPlatformAdmin) redirect('/')

  const db = adminClient()

  const [tenantResult, profilesResult, subscriptionResult, plansResult] = await Promise.all([
    db
      .from('tenants')
      .select('id, name, slug, is_active, created_at, timezone, locale, currency, logo_url, primary_color')
      .eq('id', tenantId)
      .single(),
    db
      .from('profiles')
      .select('id, full_name, is_active, approval_status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    db
      .from('tenant_subscriptions')
      .select('plan_id, status, billing_cycle, current_period_start, current_period_end')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    db
      .from('subscription_plans')
      .select('id, name, price_monthly, price_yearly, currency, trial_days')
      .eq('is_platform_plan', true)
      .eq('is_active', true)
      .order('price_monthly', { ascending: true }),
  ])

  const tenant = tenantResult.data
  if (!tenant) notFound()

  const profiles     = profilesResult.data ?? []
  const platformSub  = subscriptionResult.data ?? null
  const platformPlans = plansResult.data ?? []
  const activeSub    = platformSub

  // Count roles (profiles table has is_active flag but role is in user_roles)
  const totalMembers = profiles.length
  const activeMembers = profiles.filter((p) => p.is_active !== false).length
  const pendingApproval = profiles.filter((p) => p.approval_status === 'pending').length
  const recentSignups = profiles.filter((p) => {
    const d = new Date(p.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d >= thirtyDaysAgo
  }).length


  return (
    <div className="p-6 md:p-8 max-w-3xl">
      {/* Back */}
      <Link
        href="/super-admin/tenants"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
        style={{ color: '#737373' }}
      >
        <ArrowLeft size={14} />
        Volver a gimnasios
      </Link>

      {/* No plan assigned yet */}
      {(!activeSub || (activeSub.status !== 'active' && activeSub.status !== 'trialing')) && (
        <div
          className="rounded-lg border px-4 py-3 mb-6 text-sm"
          style={{ background: '#2a1f11', borderColor: '#3a2a15', color: '#f0b429' }}
        >
          Este negocio no tiene un plan asignado — la app no mostrará ningún módulo hasta asignar uno abajo.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#f0f0f0' }}>
            {tenant.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <code
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: '#1a1a1a', color: '#a3a3a3', fontFamily: 'monospace' }}
            >
              {tenant.slug}
            </code>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Circle
                size={6}
                fill={tenant.is_active ? '#22c55e' : '#525252'}
                style={{ color: tenant.is_active ? '#22c55e' : '#525252' }}
              />
              <span style={{ color: tenant.is_active ? '#22c55e' : '#737373' }}>
                {tenant.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </span>
          </div>
        </div>
        <TenantToggleButton tenantId={tenant.id} isActive={tenant.is_active} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total miembros', value: totalMembers, icon: <Users size={16} /> },
          { label: 'Activos',        value: activeMembers, icon: <UserCheck size={16} /> },
          { label: 'Pendientes',     value: pendingApproval, icon: <Circle size={16} /> },
          { label: 'Últimos 30d',    value: recentSignups, icon: <Calendar size={16} /> },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-4 border"
            style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: '#525252' }}>
              {stat.icon}
              <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums" style={{ color: '#e5e5e5' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div
        className="rounded-lg border p-5 mb-6 space-y-3"
        style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#a3a3a3' }}>
          Configuración
        </h2>
        {[
          { label: 'Zona horaria', value: tenant.timezone ?? '—' },
          { label: 'Moneda',       value: tenant.currency  ?? '—' },
          { label: 'Locale',       value: tenant.locale    ?? '—' },
          {
            label: 'Miembro desde',
            value: new Date(tenant.created_at).toLocaleDateString('es-CR', {
              day: '2-digit', month: 'long', year: 'numeric',
            }),
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm py-2 border-b last:border-b-0" style={{ borderColor: '#1a1a1a' }}>
            <span style={{ color: '#525252' }}>{label}</span>
            <span style={{ color: '#a3a3a3' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Branding */}
      <BrandingForm
        tenantId={tenant.id}
        logoUrl={tenant.logo_url}
        primaryColor={tenant.primary_color}
      />

      {/* Platform subscription management */}
      {platformPlans.length > 0 && (
        <div className="mb-6">
          <PlatformSubscriptionForm
            tenantId={tenant.id}
            plans={platformPlans as any}
            subscription={platformSub as any}
          />
        </div>
      )}

      {/* Recent members */}
      {profiles.length > 0 && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: '#0d0d0d', borderColor: '#1f1f1f' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: '#1f1f1f', background: '#111111' }}>
            <h2 className="text-sm font-semibold" style={{ color: '#a3a3a3' }}>
              Miembros recientes
            </h2>
          </div>
          <ul className="divide-y" style={{ borderColor: '#1a1a1a' }}>
            {profiles.slice(0, 10).map((p) => (
              <li key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#1f1f1f', color: '#737373' }}
                  >
                    {(p.full_name ?? '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm" style={{ color: '#e5e5e5' }}>
                    {p.full_name ?? '—'}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: p.approval_status === 'approved' ? '#14532d33' : '#1f1f1f',
                    color: p.approval_status === 'approved' ? '#22c55e' : '#525252',
                  }}
                >
                  {p.approval_status === 'approved' ? 'Aprobado' : p.approval_status === 'pending' ? 'Pendiente' : p.approval_status ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
