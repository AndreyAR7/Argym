'use client'

import { useActionState } from 'react'
import { User, Mail, Phone, MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { sendContactMessageAction } from '../contact-actions'

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactMessageAction, null)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-lg font-semibold text-white">¡Mensaje enviado!</p>
        <p className="text-sm text-gray-400">Te contactaremos pronto a la brevedad posible.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4 text-left">
      {state?.error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{state.error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="group relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-indigo-400" />
          <input
            name="name"
            type="text"
            required
            placeholder="Tu nombre"
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
          />
        </div>

        <div className="group relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-indigo-400" />
          <input
            name="email"
            type="email"
            required
            placeholder="Tu correo"
            disabled={isPending}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="group relative">
        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-indigo-400" />
        <input
          name="phone"
          type="tel"
          placeholder="Teléfono (opcional)"
          disabled={isPending}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
        />
      </div>

      <div className="group relative">
        <MessageSquare className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-500 transition-colors group-focus-within:text-indigo-400" />
        <textarea
          name="message"
          required
          rows={4}
          placeholder="Contanos sobre tu gimnasio y qué necesitas..."
          disabled={isPending}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:px-8"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
