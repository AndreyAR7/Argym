import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Dumbbell, TrendingUp, Trophy, CalendarDays, Video, CreditCard,
  Users, Heart, UserCog, ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ARGYM_LOGO_URL } from '@/lib/branding'
import { ContactForm } from './_components/contact-form'
import { FeatureExplorer } from './_components/feature-explorer'
import { PricingCalculator } from './_components/pricing-calculator'
import { ParticleNetwork } from '@/components/effects/particle-network'
import { FitnessHud } from '@/components/effects/fitness-hud'
import { AnimatedCounter } from '@/components/effects/animated-counter'

export const metadata = {
  title: 'ARGYM — Plataforma de gestión para gimnasios',
  description:
    'Plataforma completa para coaches, clientes y administradores. Seguimiento de progreso, citas, nutrición y gamificación.',
}

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Platform admins are a trusted, already-vetted identity independent of
    // any single tenant's approval workflow — check this FIRST and skip
    // approval_status entirely. They pick which gym to operate every login
    // instead of being tied to whatever tenant_id their profile last pointed to.
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin')
    if (isPlatformAdmin) redirect('/select-gym')

    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || profile.approval_status !== 'approved') {
      redirect('/pending-approval')
    }

    if (profile.is_active === false) {
      redirect('/account-suspended')
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const role = (userRole as any)?.roles?.name as string | undefined

    if (role === 'admin' || role === 'full_access') redirect('/admin/dashboard')
    if (role === 'coach') redirect('/coach')
    if (role === 'client') redirect('/client/inicio')
    // No role assigned yet — send to pending-approval to avoid redirect loop
    // with role-specific layouts that redirect back here when role doesn't match.
    redirect('/pending-approval')
  }

  // ─── Unauthenticated visitors: render landing page ───────────────────────

  const features = [
    {
      icon: Dumbbell,
      color: '#818cf8',
      title: 'Gestión de rutinas',
      description:
        'Crea y asigna rutinas personalizadas con seguimiento de ejercicios',
    },
    {
      icon: TrendingUp,
      color: '#22d3ee',
      title: 'Analíticas en tiempo real',
      description:
        'KPIs ejecutivos, ingresos, suscripciones y métricas de negocio',
    },
    {
      icon: Trophy,
      color: '#fb923c',
      title: 'Gamificación',
      description:
        'Rankings, retos, insignias y sistema de XP para motivar a tus clientes',
    },
    {
      icon: CalendarDays,
      color: '#34d399',
      title: 'Agenda inteligente',
      description:
        'Gestión de citas con calendarios, notificaciones y seguimiento de estados',
    },
    {
      icon: Video,
      color: '#a78bfa',
      title: 'Biblioteca de videos',
      description:
        'Videos de entrenamiento organizados por nivel y asignados a cada cliente',
    },
    {
      icon: CreditCard,
      color: '#60a5fa',
      title: 'Facturación integrada',
      description:
        'Planes, suscripciones y facturación con integración Stripe',
    },
  ]

  const stats = [
    { value: '100+', label: 'Clientes activos', icon: Users },
    { value: '98%', label: 'Satisfacción', icon: Heart },
    { value: '50+', label: 'Coaches', icon: UserCog },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-16">
        <div className="flex items-center gap-2.5">
          <img src={ARGYM_LOGO_URL} alt="ARGYM" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-2xl font-extrabold tracking-tight text-white">
            ARGYM
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#funcionalidades"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white md:inline-block"
          >
            Funcionalidades
          </a>
          <a
            href="#precios"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white md:inline-block"
          >
            Precios
          </a>
          <a
            href="#contacto"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white sm:inline-block"
          >
            Contáctenos
          </a>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            Comenzar gratis
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
        style={{
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #12111e 100%)',
        }}
      >
        {/* Subtle radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '700px',
              height: '500px',
              borderRadius: '50%',
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </div>

        {/* Interactive tech backdrop — same particle network + fitness HUD used on login */}
        <ParticleNetwork color="#818cf8" />
        <FitnessHud ringSize={260} />

        <div className="relative max-w-3xl">
          <div className="argym-fade-in mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            Tecnología de gestión para gimnasios modernos
          </div>

          <h1
            className="argym-fade-in mt-4 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl"
            style={{ animationDelay: '0.12s' }}
          >
            Gestiona tu gimnasio con{' '}
            <span
              style={{
                background:
                  'linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              inteligencia
            </span>
          </h1>

          <p
            className="argym-fade-in mt-6 text-lg leading-relaxed text-gray-400 md:text-xl"
            style={{ animationDelay: '0.24s' }}
          >
            Plataforma completa para coaches, clientes y administradores.
            Seguimiento de progreso, citas, nutrición y gamificación.
          </p>

          <div
            className="argym-fade-in mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            style={{ animationDelay: '0.36s' }}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-500/30"
            >
              Comenzar ahora
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Down-arrow hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 sm:flex-row sm:justify-around">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 text-center sm:flex-col sm:text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 sm:mb-1">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-4xl font-extrabold text-indigo-600">
                  <AnimatedCounter value={value} />
                </p>
                <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="mt-4 text-gray-500 md:text-lg">
            Herramientas diseñadas para hacer crecer tu negocio de fitness
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {features.map(({ icon: Icon, color, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md"
            >
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: color + '18', color }}
              >
                <Icon size={22} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature explorer (by role + platform) ──────────────────────── */}
      <section id="funcionalidades" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Explora por rol</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
            Cada rol ve exactamente lo que necesita
          </h2>
          <p className="mt-4 text-gray-500 md:text-lg">
            Filtra por rol o por plataforma para ver el alcance real de admin, coach y cliente — en web y en la app móvil.
          </p>
        </div>
        <FeatureExplorer />
      </section>

      {/* ── Platform capabilities ───────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Lo que sostiene los tres roles</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Capacidades de plataforma
            </h2>
            <p className="mt-4 text-gray-500 md:text-lg">
              Lo que convierte esto en un producto SaaS y no en una app de un solo gimnasio.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { n: '01', title: 'Multi-tenant real', body: 'Un panel "ARGYM HQ" opera múltiples gimnasios clientes desde una sola instalación.', color: '#818cf8' },
              { n: '02', title: 'Facturación en dos niveles', body: 'Cada gimnasio cobra a sus clientes con Stripe, y la plataforma puede cobrarle a cada gimnasio.', color: '#22d3ee' },
              { n: '03', title: 'Gamificación', body: 'XP, niveles, rachas, logros y retos conectados directamente al check-in.', color: '#fb923c' },
              { n: '04', title: 'Notificaciones multicanal', body: 'Push, correo (SMTP o Resend) y WhatsApp, gobernados por el motor de Correspondencia.', color: '#34d399' },
              { n: '05', title: 'Check-in por QR', body: 'Token rotativo firmado, límites semanales por plan, bitácora de cada intento.', color: '#60a5fa' },
              { n: '06', title: 'Contenido con permisos', body: 'Videos, rutinas y nutrición restringidos por nivel del cliente o por el plan contratado.', color: '#818cf8' },
              { n: '07', title: 'Invitaciones con auto-aprobación', body: 'El invitado entra activo de inmediato si se registra con el correo invitado.', color: '#22d3ee' },
              { n: '08', title: 'Roles y permisos finos', body: 'Permisos independientes por función; cambiar de rol nunca borra historial del cliente.', color: '#fb923c' },
              { n: '09', title: 'Multi-sucursal', body: 'Cada sede con su propio QR, personal asignado y estadísticas.', color: '#34d399' },
              { n: '10', title: 'Ficha médica y legal', body: 'Tabla separada y protegida — respaldo ante cualquier reclamo por lesión.', color: '#60a5fa' },
              { n: '11', title: 'Sincronización de calendario', body: 'Feed iCal personal por cliente, con token que se puede rotar.', color: '#818cf8' },
              { n: '12', title: 'Analítica exportable', body: 'Panel de ingresos y reportes de asistencia exportables a Excel.', color: '#22d3ee' },
            ].map((tile) => (
              <div
                key={tile.n}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className="mb-3.5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-xs font-extrabold"
                  style={{ backgroundColor: tile.color + '22', color: tile.color }}
                >
                  {tile.n}
                </div>
                <h4 className="mb-1.5 text-[14.5px] font-bold text-gray-900">{tile.title}</h4>
                <p className="text-[13px] leading-relaxed text-gray-500">{tile.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Health-professional callout ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-24">
        <div className="flex flex-wrap items-start gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-7">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-extrabold text-white">
            Rx
          </span>
          <div>
            <h3 className="mb-1.5 text-base font-bold text-gray-900">Pensado también para el criterio clínico</h3>
            <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
              Ficha médica y legal con respaldo ante lesiones, seguimiento real de progreso corporal, rutinas y
              nutrición filtradas por nivel del cliente, y gamificación que mejora la adherencia al plan — lo que
              un coach certificado o un profesional de la salud necesita para respaldar su trabajo, no solo cobrar
              membresías.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="precios" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600">Mercado de Costa Rica · ₡ CRC</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Precios sugeridos</h2>
        </div>
        <p className="mx-auto mb-14 max-w-2xl text-center text-gray-500 md:text-lg">
          Referencia para un solo gimnasio con una o varias sedes. Todos los planes incluyen la app móvil y el
          panel web para los tres roles. <b className="text-gray-900">+IVA (13%)</b>.
        </p>
        <PricingCalculator />
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-24 text-center"
        style={{
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 60%, #12111e 100%)',
        }}
      >
        <ParticleNetwork color="#818cf8" />

        <div className="relative mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            ¿Listo para transformar tu gimnasio?
          </h2>
          <p className="mt-4 text-gray-400">
            Únete a los gimnasios que ya gestionan su negocio con ARGYM
          </p>
          <Link
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Empezar gratis
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <section
        id="contacto"
        className="relative overflow-hidden py-24"
        style={{
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #12111e 100%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-120px] h-[420px] w-[420px] rounded-full opacity-[0.14] blur-3xl"
          style={{ background: '#818cf8' }}
        />

        <div className="relative mx-auto max-w-xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            Contáctenos
          </h2>
          <p className="mt-4 text-gray-400">
            Cuéntanos sobre tu gimnasio y te ayudamos a ponerlo en marcha en ARGYM.
          </p>

          <div className="mt-10">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} ARGYM. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
