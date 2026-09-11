'use client'

import { useState } from 'react'

type Role = 'all' | 'admin' | 'coach' | 'client'
type Platform = 'all' | 'web' | 'movil'

interface Feature {
  title: string
  description: string
  note?: string
}

interface RoleBlock {
  role: 'admin' | 'coach' | 'client'
  platform: 'web' | 'movil'
  features: Feature[]
}

const ROLE_META: Record<'admin' | 'coach' | 'client', { label: string; badge: string; text: string; bg: string; dot: string; activeBg: string }> = {
  admin:  { label: 'Administrador', badge: 'ADM',   text: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-400', activeBg: 'bg-indigo-600' },
  coach:  { label: 'Coach',         badge: 'COACH', text: 'text-cyan-600',   bg: 'bg-cyan-50',   dot: 'bg-cyan-400',   activeBg: 'bg-cyan-600' },
  client: { label: 'Cliente',       badge: 'CLI',   text: 'text-orange-600',bg: 'bg-orange-50', dot: 'bg-orange-400', activeBg: 'bg-orange-600' },
}

// Inventory reflects the real state of the code (apps/web/src/app + apps/mobile/app).
const BLOCKS: RoleBlock[] = [
  {
    role: 'admin', platform: 'web',
    features: [
      { title: 'Panel de control', description: 'KPIs del gimnasio: clientes, ingresos, aprobaciones pendientes y alertas.' },
      { title: 'Clientes', description: 'Lista con filtros y ficha médica visible, alta directa o por invitación con auto-aprobación al aceptar.' },
      { title: 'Cambio de rol', description: 'Vuelve coach o admin a un cliente sin perder su racha, gamificación ni planes activos.' },
      { title: 'Ficha de cliente', description: 'Perfil, historial de suscripciones, medidas corporales y ficha médica en un solo lugar.' },
      { title: 'Coaches', description: 'Alta y gestión del equipo de entrenadores.' },
      { title: 'Citas', description: 'Lista y calendario semanal, elección Clase/Cita al crear, modal de invitados con reenvío de confirmación.' },
      { title: 'Clases', description: 'Clases programadas reales y horarios recurrentes que generan clases cada noche automáticamente.' },
      { title: 'Rutinas', description: 'Biblioteca completa: crear, clonar, activar, editor de ejercicios con video demo.' },
      { title: 'Videos', description: 'Subir archivo, grabar con cámara o enlazar video externo; borrador/publicado/archivado.' },
      { title: 'Planes nutricionales', description: 'Biblioteca de planes alimenticios con macros objetivo.' },
      { title: 'Planes (membresías)', description: 'Precio, ciclo de cobro, acceso físico, límite de check-ins semanales.' },
      { title: 'Promociones', description: 'Descuentos y paquetes ligados a planes o sucursales.' },
      { title: 'Sucursales', description: 'Multi-sede, cada una con su propio QR y pantalla Monitor.' },
      { title: 'QR de check-in', description: 'Código rotativo por sucursal para autoregistro de asistencia.' },
      { title: 'Reporte de asistencia', description: 'Cada intento de check-in, exitoso o bloqueado, con motivo.' },
      { title: 'Aprobaciones', description: 'Aprobar o rechazar registros nuevos con selección de rol.' },
      { title: 'Facturación', description: 'Facturas de Stripe, estados de pago, ingresos y mora.' },
      { title: 'Analíticas', description: 'Ingresos, clientes y suscripciones, con exportación a Excel.' },
      { title: 'Gamificación', description: 'Ranking del gimnasio, XP, rachas y creación de retos.' },
      { title: 'Correspondencia', description: 'Motor de reglas: un evento dispara correo o WhatsApp a quien corresponda.' },
      { title: 'Notificaciones', description: 'Envío manual de push a todos, clientes o coaches.' },
      { title: 'Ajustes', description: 'Zona horaria, moneda, logo, período de gracia, cupo por clase.' },
      { title: 'Monitor de sucursal', description: 'Pantalla de piso con el QR y check-ins recientes en vivo.' },
    ],
  },
  {
    role: 'coach', platform: 'web',
    features: [
      { title: 'Mi panel', description: 'Citas próximas y clientes asignados.' },
      { title: 'Mis clientes', description: 'Solo los que le fueron asignados.' },
      { title: 'Citas', description: 'Mismas herramientas que admin, acotadas a las propias (las de otros coaches se ven atenuadas para contexto).' },
      { title: 'Rutinas', description: 'Paridad total con admin: crea, clona y edita cualquier rutina del gimnasio, y las asigna directo a un cliente.' },
      { title: 'Videos', description: 'Paridad total con admin: sube, edita y publica en la biblioteca compartida.' },
      { title: 'Planes nutricionales', description: 'Consulta la biblioteca del gimnasio.' },
      { title: 'Perfil', description: 'Datos propios y contraseña.' },
    ],
  },
  {
    role: 'client', platform: 'web',
    features: [
      { title: 'Inicio', description: 'Panel personal.' },
      { title: 'Mis citas', description: 'Incluye clases grupales donde fue invitado, no solo las propias; confirmar/rechazar, mapa o videollamada.' },
      { title: 'Check-in por QR', description: 'Escanea el código de la sucursal desde la cámara del navegador.' },
      { title: 'Progreso', description: 'Historial de medidas corporales.' },
      { title: 'Rutina y Nutrición', description: 'Su plan asignado.' },
      { title: 'Videos', description: 'Biblioteca filtrada por su nivel y plan.' },
      { title: 'Planes', description: 'Comprar o subir de plan, pago con Stripe.' },
      { title: 'Suscripciones y Facturación', description: 'Historial y portal de pagos de Stripe.' },
      { title: 'Gamificación', description: 'Nivel, XP, racha, logros, ranking y retos propios.' },
      { title: 'Ficha médica', description: 'Condiciones, alergias y contacto de emergencia, auto-gestionado.' },
      { title: 'Perfil', description: 'Datos propios y contraseña.' },
    ],
  },
  {
    role: 'admin', platform: 'movil',
    features: [
      { title: 'Panel', description: 'Mismos KPIs que la web, en el bolsillo.' },
      { title: 'Clientes', description: 'Altas, aprobaciones, invitaciones y planes, igual que en web.' },
      { title: 'Ficha médica de cliente', description: 'Para llenarla en nombre del cliente si él no lo hizo.' },
      { title: 'Citas', description: 'Gestión completa desde el teléfono.' },
      { title: 'Contenido', description: 'Videos y rutinas en un solo gestor combinado: subir, grabar o importar documento.' },
      { title: 'Monetización', description: 'Planes y promociones en una sola pantalla, con activar/desactivar.' },
      { title: 'Ingresos', description: 'Reporte con tendencia mensual, exportar y compartir.' },
      { title: 'Aprobaciones y Notificaciones', description: 'Iguales que en web.' },
      { title: 'Ajustes', description: 'Configuración del gimnasio y de su cuenta.' },
    ],
  },
  {
    role: 'coach', platform: 'movil',
    features: [
      { title: 'Panel y Mis clientes', description: 'Igual que en web.' },
      { title: 'Citas', description: 'Gestión de sus propias citas.' },
      { title: 'Rutinas y Videos', description: 'Crear y subir todavía es exclusivo de la versión web.', note: 'brecha vs. web' },
      { title: 'Nutrición', description: 'Consulta de la biblioteca.' },
      { title: 'Selección de clientes', description: 'Para armar clases grupales.' },
      { title: 'Notificaciones', description: 'Bandeja de avisos.' },
    ],
  },
  {
    role: 'client', platform: 'movil',
    features: [
      { title: 'Inicio, Mis citas, Progreso', description: 'Mismo alcance que la web.' },
      { title: 'Check-in por QR', description: 'Con la cámara nativa del teléfono.' },
      { title: 'Rutina', description: 'Con video demo por ejercicio.' },
      { title: 'Nutrición y Videos', description: 'Consulta y reproducción.' },
      { title: 'Planes y Facturación', description: 'Compra y pagos con Stripe.' },
      { title: 'Gamificación', description: 'XP, logros, ranking y retos completos.' },
      { title: 'Promociones', description: 'Ofertas activas.' },
      { title: 'Ficha médica', description: 'Auto-gestionada.' },
      { title: 'Perfil', description: 'Con punto rojo cuando falta configurar una contraseña de respaldo.' },
    ],
  },
]

export function FeatureExplorer() {
  const [role, setRole] = useState<Role>('all')
  const [platform, setPlatform] = useState<Platform>('all')

  const visible = BLOCKS.filter(
    (b) => (role === 'all' || b.role === role) && (platform === 'all' || b.platform === platform),
  )

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-gray-400">Rol</span>
          {(['all', 'admin', 'coach', 'client'] as Role[]).map((r) => {
            const active = role === r
            const activeBg = r === 'all' ? 'bg-gray-900' : ROLE_META[r as 'admin' | 'coach' | 'client'].activeBg
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active ? `${activeBg} text-white` : 'border border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                {r === 'all' ? 'Todos' : ROLE_META[r as 'admin' | 'coach' | 'client'].label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-gray-400">Plataforma</span>
          {(['all', 'web', 'movil'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                platform === p ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500 hover:text-gray-900'
              }`}
            >
              {p === 'all' ? 'Ambas' : p === 'web' ? 'Web' : 'Móvil'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {visible.map((block, i) => {
          const meta = ROLE_META[block.role]
          return (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${meta.bg} ${meta.text}`}>
                  {meta.badge}
                </span>
                <h3 className="text-lg font-bold text-gray-900">{meta.label}</h3>
                <span className="ml-auto rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {block.platform === 'web' ? 'Web' : 'App'}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {block.features.map((f, j) => (
                  <li key={j} className="relative pl-4 text-sm leading-relaxed text-gray-600">
                    <span className={`absolute left-0 top-2 h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    <b className="font-semibold text-gray-900">{f.title}</b> — {f.description}
                    {f.note && (
                      <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">{f.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
