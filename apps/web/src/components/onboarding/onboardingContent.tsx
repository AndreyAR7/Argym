import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Building2, Dumbbell, CalendarDays, CreditCard,
  Trophy, Mail, Settings, Users, Home, Sparkles, User,
} from 'lucide-react'

export type WebRole = 'admin' | 'coach' | 'client'

export interface OnboardingSlide {
  id: string
  icon: LucideIcon
  title: string
  description: string
}

// One slide per section of that role's real sidebar (components/{role}/sidebar.tsx)
// — same grouping the sidebar itself already uses, so the tour reads like a
// preview of exactly what's one click away afterward.
const ADMIN_SLIDES: OnboardingSlide[] = [
  { id: 'dashboard', icon: LayoutDashboard, title: 'Tu dashboard', description: 'Las métricas clave de tu gimnasio, de un vistazo: miembros, ingresos y actividad reciente.' },
  { id: 'gestion', icon: Building2, title: 'Gestión', description: 'Sucursales, el QR de check-in, tus clientes, tus coaches y las aprobaciones de nuevos usuarios.' },
  { id: 'contenido', icon: Dumbbell, title: 'Contenido', description: 'Sube videos, arma rutinas y planes de nutrición para que tus clientes los sigan.' },
  { id: 'agenda', icon: CalendarDays, title: 'Agenda', description: 'Supervisa la agenda completa de citas de todo el gimnasio.' },
  { id: 'monetizacion', icon: CreditCard, title: 'Monetización', description: 'Define tus planes y promociones, y consulta facturación y analíticas de tu negocio.' },
  { id: 'comunidad', icon: Trophy, title: 'Comunidad', description: 'Activa retos, insignias y rankings que mantienen motivados a tus clientes.' },
  { id: 'comunicacion', icon: Mail, title: 'Comunicación', description: 'Configura las plantillas y reglas de correo automático que reciben tus clientes.' },
  { id: 'configuracion', icon: Settings, title: 'Configuración', description: 'Notificaciones y ajustes generales de tu gimnasio, siempre a la mano.' },
]

const COACH_SLIDES: OnboardingSlide[] = [
  { id: 'panel', icon: LayoutDashboard, title: 'Tu panel', description: 'Un resumen de tu día: próximas citas y clientes activos.' },
  { id: 'clientes', icon: Users, title: 'Tus clientes', description: 'Consulta el progreso y los datos de cada persona que entrenas.' },
  { id: 'contenido', icon: Dumbbell, title: 'Contenido', description: 'Crea rutinas, sube videos y planes de nutrición personalizados para tus clientes.' },
  { id: 'agenda', icon: CalendarDays, title: 'Agenda', description: 'Gestiona, confirma y da seguimiento a tus sesiones agendadas.' },
  { id: 'perfil', icon: User, title: 'Tu perfil', description: 'Actualiza tus datos y preferencias cuando quieras.' },
]

const CLIENT_SLIDES: OnboardingSlide[] = [
  { id: 'inicio', icon: Home, title: 'Tu inicio', description: 'Un vistazo diario a tu racha, tu progreso y lo próximo en tu plan.' },
  { id: 'entrenamiento', icon: Dumbbell, title: 'Mi entrenamiento', description: 'Tus rutinas y la biblioteca de videos con cada ejercicio explicado paso a paso.' },
  { id: 'agenda', icon: CalendarDays, title: 'Agenda', description: 'Escanea el QR de check-in al llegar al gimnasio, y agenda o confirma tus citas.' },
  { id: 'salud', icon: Sparkles, title: 'Salud', description: 'Tu plan de nutrición y las mediciones que muestran tu evolución real.' },
  { id: 'comunidad', icon: Trophy, title: 'Comunidad', description: 'Gana XP, sube en el ranking, desbloquea logros y compite en retos con otros miembros.' },
  { id: 'cuenta', icon: CreditCard, title: 'Mi cuenta', description: 'Tus planes, tu suscripción y tu perfil, todo en un mismo lugar.' },
]

export function getOnboardingSlides(role: WebRole): OnboardingSlide[] {
  if (role === 'admin') return ADMIN_SLIDES
  if (role === 'coach') return COACH_SLIDES
  return CLIENT_SLIDES
}

export function welcomeCopy(role: WebRole, firstName: string | null): { title: string; description: string } {
  const nameSuffix = firstName ? `, ${firstName}` : ''
  if (role === 'admin') {
    return {
      title: `¡Bienvenido${nameSuffix}!`,
      description: 'Este es el panel de control de tu gimnasio. Te mostramos rápidamente dónde está cada cosa.',
    }
  }
  if (role === 'coach') {
    return {
      title: `¡Bienvenido${nameSuffix}!`,
      description: 'Aquí tienes todo lo que necesitas para acompañar a tus clientes.',
    }
  }
  return {
    title: `¡Bienvenido a ARGYM${nameSuffix}!`,
    description: 'Tu gimnasio, siempre contigo. Te damos un vistazo rápido de todo lo que puedes hacer.',
  }
}
