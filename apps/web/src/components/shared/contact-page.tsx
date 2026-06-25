'use client'

import { useState } from 'react'
import { Mail, Phone, Clock, MessageSquare, Send, CheckCircle } from 'lucide-react'

const CONTACT_INFO = [
  { icon: Mail,  label: 'Correo electrónico', value: 'soporte@argym.app' },
  { icon: Phone, label: 'WhatsApp',            value: '+506 8888-0000'    },
  { icon: Clock, label: 'Horario de atención', value: 'Lun – Vie · 8:00 a.m. – 6:00 p.m.' },
]

export function ContactPage({ accentColor = 'var(--color-admin)' }: { accentColor?: string }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Simulate submit (no backend yet — can be wired up later)
    setTimeout(() => { setLoading(false); setSent(true) }, 900)
  }

  const inputStyle = {
    backgroundColor: 'var(--color-input)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-foreground)',
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
        >
          <MessageSquare size={20} style={{ color: accentColor }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-foreground)' }}>Contáctenos</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Estamos aquí para ayudarte. Escríbenos y te responderemos pronto.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Contact info */}
        <div className="md:col-span-2 flex flex-col gap-3">
          {CONTACT_INFO.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl p-4 border"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
              >
                <Icon size={14} style={{ color: accentColor }} />
              </div>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div
          className="md:col-span-3 rounded-xl border p-5"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {sent ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
              >
                <CheckCircle size={22} style={{ color: accentColor }} />
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>¡Mensaje enviado!</p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Te responderemos en el siguiente día hábil.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-2 text-sm font-medium hover:underline"
                style={{ color: accentColor }}
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>Envíanos un mensaje</h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Nombre</label>
                  <input type="text" required placeholder="Tu nombre" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Correo</label>
                  <input type="email" required placeholder="tu@email.com" className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Asunto</label>
                <select required className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} defaultValue="">
                  <option value="" disabled>Seleccionar asunto</option>
                  <option>Problema técnico</option>
                  <option>Consulta sobre mi plan</option>
                  <option>Solicitud de información</option>
                  <option>Sugerencia o mejora</option>
                  <option>Otro</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Mensaje</label>
                <textarea
                  required rows={4} placeholder="Describe tu consulta en detalle…"
                  className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                <Send size={14} />
                {loading ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
