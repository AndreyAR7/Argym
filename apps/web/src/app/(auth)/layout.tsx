import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ARGYM_LOGO_URL } from '@/lib/branding'
import { ParticleNetwork } from '@/components/auth/particle-network'
import { FitnessHud } from '@/components/auth/fitness-hud'

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
  const logoUrl = tenant?.logo_url ?? ARGYM_LOGO_URL

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
        {/* Drifting glow orbs */}
        <div
          className="argym-orb-1 absolute top-[-140px] left-[-100px] w-[420px] h-[420px] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: 'var(--color-admin)' }}
        />
        <div
          className="argym-orb-2 absolute bottom-[-160px] right-[-120px] w-[380px] h-[380px] rounded-full opacity-[0.12] blur-3xl"
          style={{ background: tenant?.primary_color ? 'oklch(65% 0.2 45)' : '#f97316' }}
        />

        {/* Interactive particle network */}
        <ParticleNetwork color={tenant?.primary_color ?? '#818cf8'} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt={brandName} className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-semibold text-lg tracking-tight">{brandName}</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div
              className="argym-glow absolute inset-0 rounded-full blur-2xl"
              style={{ background: 'var(--color-admin)' }}
            />
            <img
              src={logoUrl}
              alt={brandName}
              className="argym-logo-float relative w-40 h-40 rounded-2xl object-cover shadow-2xl"
            />
          </div>

          <h2 className="text-2xl font-bold leading-snug" style={{ color: 'oklch(97% 0 0)' }}>
            Gestión profesional<br />para tu gimnasio
          </h2>
          <p className="mt-3 text-sm leading-relaxed max-w-[320px]" style={{ color: 'oklch(60% 0 0)' }}>
            Administra clientes, coaches, rutinas y pagos desde una sola plataforma.
          </p>
        </div>

        <div className="relative z-10 text-center">
          <p className="text-xs" style={{ color: 'oklch(40% 0 0)' }}>
            © {new Date().getFullYear()} {brandName} Platform
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-6 bg-[var(--color-background)]"
        style={(tenant?.primary_color ? { '--color-admin': tenant.primary_color } : {}) as React.CSSProperties}
      >
        {/* Faint grid + drifting glow, echoing the brand panel so the whole screen feels alive */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="argym-orb-1 absolute top-[-160px] right-[-140px] w-[440px] h-[440px] rounded-full opacity-[0.06] blur-3xl pointer-events-none"
          style={{ background: 'var(--color-admin)' }}
        />
        <div
          className="argym-orb-2 absolute bottom-[-180px] left-[-120px] w-[380px] h-[380px] rounded-full opacity-[0.05] blur-3xl pointer-events-none"
          style={{ background: 'var(--color-admin)' }}
        />

        {/* Gym + tech: scrolling heart-rate line and spinning activity rings */}
        <FitnessHud />

        <div className="argym-fade-in relative z-10 w-full max-w-[400px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/90 backdrop-blur-sm p-8 shadow-xl shadow-black/[0.04]">
          {/* Logo visible solo en mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={logoUrl} alt={brandName} className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-semibold text-base tracking-tight">{brandName}</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
