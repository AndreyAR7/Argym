import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.approval_status === 'pending') {
      redirect('/pending-approval')
    }

    if (profile.approval_status === 'rejected') {
      redirect('/pending-approval')
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const role = (userRole as any)?.roles?.name as string | undefined

    if (role === 'admin') redirect('/admin/dashboard')
    if (role === 'coach') redirect('/coach')
    if (role === 'client') redirect('/client/inicio')
    // No role assigned yet — send to pending-approval to avoid redirect loop
    // with role-specific layouts that redirect back here when role doesn't match.
    redirect('/pending-approval')
  }

  // ─── Unauthenticated visitors: render landing page ───────────────────────

  const features = [
    {
      icon: '🏋️',
      title: 'Gestión de rutinas',
      description:
        'Crea y asigna rutinas personalizadas con seguimiento de ejercicios',
    },
    {
      icon: '📊',
      title: 'Analíticas en tiempo real',
      description:
        'KPIs ejecutivos, ingresos, suscripciones y métricas de negocio',
    },
    {
      icon: '🏆',
      title: 'Gamificación',
      description:
        'Rankings, retos, insignias y sistema de XP para motivar a tus clientes',
    },
    {
      icon: '📅',
      title: 'Agenda inteligente',
      description:
        'Gestión de citas con calendarios, notificaciones y seguimiento de estados',
    },
    {
      icon: '🎬',
      title: 'Biblioteca de videos',
      description:
        'Videos de entrenamiento organizados por nivel y asignados a cada cliente',
    },
    {
      icon: '💳',
      title: 'Facturación integrada',
      description:
        'Planes, suscripciones y facturación con integración Stripe',
    },
  ]

  const stats = [
    { value: '100+', label: 'Clientes activos' },
    { value: '98%', label: 'Satisfacción' },
    { value: '50+', label: 'Coaches' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-16">
        <span className="text-2xl font-extrabold tracking-tight text-white">
          ARGYM
        </span>
        <div className="flex items-center gap-3">
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
        className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center"
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

        <div className="relative max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span>Plataforma todo-en-uno para gimnasios</span>
          </div>

          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
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

          <p className="mt-6 text-lg leading-relaxed text-gray-400 md:text-xl">
            Plataforma completa para coaches, clientes y administradores.
            Seguimiento de progreso, citas, nutrición y gamificación.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
            >
              Comenzar ahora
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
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
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-extrabold text-indigo-600">{value}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{label}</p>
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
          {features.map(({ icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-2xl">
                {icon}
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

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section
        className="py-24 text-center"
        style={{
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 60%, #12111e 100%)',
        }}
      >
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            ¿Listo para transformar tu gimnasio?
          </h2>
          <p className="mt-4 text-gray-400">
            Únete a los gimnasios que ya gestionan su negocio con ARGYM
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
          >
            Empezar gratis
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} ARGYM. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
