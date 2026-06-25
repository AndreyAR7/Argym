import { HelpCircle, BookOpen, MessageCircle, Video, ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: '¿Cómo agendo una cita con mi coach?',
    a: 'Ve al módulo de Citas en el menú lateral. Haz clic en "Nueva cita", elige el coach y el cliente, selecciona fecha y hora, y guarda. Recibirás una confirmación de inmediato.',
  },
  {
    q: '¿Cómo accedo a mis rutinas de entrenamiento?',
    a: 'En el menú lateral selecciona "Rutinas". Verás las rutinas asignadas por tu coach, organizadas por día y ejercicio. Puedes marcar cada ejercicio como completado.',
  },
  {
    q: '¿Puedo cambiar mi contraseña?',
    a: 'Sí. Ve a "Mi perfil" (clic en tu nombre en la barra superior) y busca la sección de seguridad. Allí puedes actualizar tu contraseña en cualquier momento.',
  },
  {
    q: '¿Los videos están disponibles sin conexión?',
    a: 'Actualmente los videos requieren conexión a internet. Están disponibles en alta definición desde cualquier dispositivo con acceso a tu cuenta.',
  },
  {
    q: '¿Cómo cambio el tema claro/oscuro?',
    a: 'Haz clic en tu nombre en la barra superior. En el menú desplegable encontrarás las opciones de tema: Claro, Oscuro y Sistema (sigue la configuración de tu dispositivo).',
  },
  {
    q: '¿Qué hago si olvidé mi contraseña?',
    a: 'En la pantalla de inicio de sesión haz clic en "¿Olvidaste tu contraseña?". Te enviaremos un correo con instrucciones para restablecerla.',
  },
]

const GUIDES = [
  { icon: BookOpen, title: 'Guía de inicio rápido', desc: 'Aprende lo esencial en 5 minutos' },
  { icon: Video,    title: 'Video tutoriales',       desc: 'Demos visuales de cada módulo' },
  { icon: MessageCircle, title: 'Chat con soporte', desc: 'Respuesta en menos de 24 horas' },
]

export function HelpPage({ accentColor = 'var(--color-admin)' }: { accentColor?: string }) {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
        >
          <HelpCircle size={20} style={{ color: accentColor }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-foreground)' }}>Centro de ayuda</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Encuentra respuestas rápidas a las preguntas más frecuentes</p>
        </div>
      </div>

      {/* Quick guides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {GUIDES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-xl p-4 flex flex-col gap-2 border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
            >
              <Icon size={15} style={{ color: accentColor }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div
          className="px-5 py-4 border-b"
          style={{ backgroundColor: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Preguntas frecuentes</h2>
        </div>
        <div style={{ backgroundColor: 'var(--color-card)' }}>
          {FAQS.map((item, i) => (
            <details
              key={i}
              className="group border-b last:border-b-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <summary
                className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-[var(--color-muted)] transition-colors"
                style={{ color: 'var(--color-foreground)' }}
              >
                <span className="text-sm font-medium pr-4">{item.q}</span>
                <ChevronDown
                  size={15}
                  className="flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: 'var(--color-muted-foreground)' }}
                />
              </summary>
              <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        ¿No encontraste lo que buscabas?{' '}
        <span className="font-medium cursor-pointer hover:underline" style={{ color: accentColor }}>
          Contáctanos
        </span>
      </p>
    </div>
  )
}
