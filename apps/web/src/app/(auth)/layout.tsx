import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

async function getTenantBranding() {
  const slug = (await headers()).get('x-tenant-slug')
  if (!slug) return null

  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, logo_url, primary_color')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return tenant
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantBranding()
  const brandName = tenant?.name ?? 'ARGYM'

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{
          background: 'oklch(11% 0.01 286)',
          ...(tenant?.primary_color ? { '--color-admin': tenant.primary_color } : {}),
        } as React.CSSProperties}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(oklch(99% 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(99% 0 0) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow orb */}
        <div
          className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'var(--color-admin)' }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-admin)' }}
              >
                <span className="text-white font-bold text-sm">{brandName[0]}</span>
              </div>
            )}
            <span className="text-white font-semibold text-lg tracking-tight">{brandName}</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-snug" style={{ color: 'oklch(97% 0 0)' }}>
              Gestión profesional<br />para tu gimnasio
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'oklch(60% 0 0)' }}>
              Administra clientes, coaches, rutinas y pagos desde una sola plataforma.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '⚡', text: 'Multi-tenant con roles granulares' },
              { icon: '📊', text: 'Dashboards de revenue en tiempo real' },
              { icon: '🏋️', text: 'Biblioteca de rutinas y videos' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <span className="text-sm" style={{ color: 'oklch(65% 0 0)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'oklch(40% 0 0)' }}>
            © {new Date().getFullYear()} {brandName} Platform
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div
        className="flex-1 flex items-center justify-center p-6 bg-[var(--color-background)]"
        style={(tenant?.primary_color ? { '--color-admin': tenant.primary_color } : {}) as React.CSSProperties}
      >
        <div className="w-full max-w-[400px]">
          {/* Logo visible solo en mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={brandName} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--color-admin)' }}
              >
                <span className="text-white font-bold text-xs">{brandName[0]}</span>
              </div>
            )}
            <span className="font-semibold text-base tracking-tight">{brandName}</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
