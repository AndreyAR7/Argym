'use client'

import { useMemo, useState } from 'react'

interface Plan {
  id: string
  name: string
  monthly: number | null
  usd: number | null
  cap: number
  scope: string
  perks: string[]
  featured?: boolean
  dark?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'arranque', name: 'Arranque', monthly: 58500, usd: 130, cap: 100,
    scope: '1 sucursal · hasta 100 clientes activos',
    perks: ['1 admin + 2 coaches', 'Citas, clases y check-in QR', 'Rutinas y videos básicos', 'Ficha médica', 'Correspondencia por correo'],
  },
  {
    id: 'crecimiento', name: 'Crecimiento', monthly: 94500, usd: 210, cap: 300,
    scope: '1 sucursal · hasta 300 clientes activos',
    perks: [
      'Coaches ilimitados',
      'Biblioteca completa: videos, rutinas, nutrición',
      'Gamificación completa (retos, ranking, logros)',
      'Invitaciones con auto-aprobación',
      'WhatsApp incluido en Correspondencia',
      'Analíticas de ingresos',
    ],
    featured: true,
  },
  {
    id: 'multisede', name: 'Multi-sede', monthly: 180000, usd: 400, cap: Infinity,
    scope: 'Sucursales y clientes ilimitados',
    perks: ['Monitor de sucursal (pantalla de piso)', 'Reporte de asistencia QR completo', 'Facturación Stripe integrada', 'Exportación a Excel', 'Soporte prioritario'],
  },
  {
    id: 'enterprise', name: 'Cadena / Enterprise', monthly: null, usd: null, cap: Infinity,
    scope: 'Múltiples franquicias o marcas',
    perks: ['App móvil de marca blanca', 'Múltiples tenants bajo un mismo grupo', 'Integraciones a medida', 'Gestor de cuenta dedicado'],
    dark: true,
  },
]

export function PricingCalculator() {
  const [clients, setClients] = useState(150)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const recommended = useMemo(
    () => PLANS.find((p) => p.monthly !== null && clients <= p.cap) ?? PLANS[2],
    [clients],
  )

  return (
    <div>
      <div className="mb-10 rounded-2xl border border-gray-100 bg-gray-50 p-7">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-[260px] flex-1">
            <label htmlFor="client-slider" className="text-sm font-bold text-gray-900">
              ¿Cuántos clientes activos tiene tu gimnasio? — <span className="text-indigo-600">{clients}</span>
            </label>
            <input
              id="client-slider"
              type="range"
              min={20}
              max={800}
              step={10}
              value={clients}
              onChange={(e) => setClients(Number(e.target.value))}
              className="mt-4 w-full accent-indigo-600"
            />
            <p className="mt-3 text-sm text-gray-600">
              Con <b className="text-gray-900">{clients}</b> clientes activos te recomendamos{' '}
              <b className="text-gray-900">{recommended?.name}</b>.
            </p>
          </div>
          <div>
            <div className="inline-flex gap-1 rounded-full border border-gray-200 bg-white p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  billing === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-500'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  billing === 'annual' ? 'bg-indigo-600 text-white' : 'text-gray-500'
                }`}
              >
                Anual (2 meses gratis)
              </button>
            </div>
            <p className="mt-2 max-w-[30ch] text-[11px] leading-relaxed text-gray-400">
              Anual = pagás 10 meses de una vez y usás el servicio 12 — el precio de abajo es ese
              total dividido en 12, para comparar contra el mensual.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isRecommended = recommended?.id === plan.id
          const monthlyEq =
            plan.monthly !== null
              ? billing === 'annual'
                ? Math.round((plan.monthly * 10) / 12 / 1000) * 1000
                : plan.monthly
              : null
          const inverted = plan.featured || plan.dark

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                plan.featured
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : plan.dark
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-100 bg-white'
              } ${isRecommended ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600">
                  MÁS ELEGIDO
                </span>
              )}
              <span className={`text-xs font-bold uppercase tracking-wide ${inverted ? 'text-white/70' : 'text-gray-400'}`}>
                {plan.name}
              </span>

              {monthlyEq !== null ? (
                <>
                  <div className="mt-2 text-[26px] font-extrabold leading-none">
                    ₡{monthlyEq.toLocaleString('es-CR')}
                    <small className={`ml-1 text-xs font-semibold ${inverted ? 'text-white/60' : 'text-gray-400'}`}>/mes</small>
                  </div>
                  <div className={`mt-1 text-[11.5px] ${inverted ? 'text-white/60' : 'text-gray-400'}`}>≈ US${plan.usd}/mes</div>
                  {billing === 'annual' && (
                    <div className={`mt-1 text-[11px] font-semibold ${plan.featured ? 'text-emerald-200' : 'text-emerald-600'}`}>
                      ₡{(plan.monthly! * 10).toLocaleString('es-CR')}/año · ahorrás ₡{(plan.monthly! * 2).toLocaleString('es-CR')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-2 text-[26px] font-extrabold leading-none">Cotización</div>
                  <div className="mt-1 text-[11.5px] text-white/60">a medida</div>
                </>
              )}

              <div className={`mt-3.5 border-t pt-3.5 text-[12.5px] ${inverted ? 'border-white/20 text-white/70' : 'border-gray-100 text-gray-500'}`}>
                {plan.scope}
              </div>
              <ul className="mt-3 flex-1 space-y-2">
                {plan.perks.map((perk, i) => (
                  <li key={i} className={`relative pl-3.5 text-[12.5px] ${inverted ? 'text-white/80' : 'text-gray-500'}`}>
                    <span className="absolute left-0">—</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-6 text-[13.5px] leading-relaxed text-gray-600">
        <b className="text-gray-900">Por qué estos precios:</b> software equivalente en Estados Unidos parte de
        US$79–139/mes (Mindbody), US$110/mes (Glofox) o US$179/mes (Wodify) — sin incluir facturación en dos
        niveles ni una app móvil propia con experiencias distintas para admin, coach y cliente. En Costa Rica,
        los proveedores locales (Gym&amp;i, XCORE, ABC Evo) no publican precio y cotizan a medida; ser
        transparente con el precio ya es una ventaja. Como referencia de valor: el plan Arranque cuesta
        aproximadamente lo mismo que dos membresías mensuales de un gimnasio promedio en el país
        (≈₡25.000–₡40.000 cada una) — y reemplaza la gestión completa del negocio, no solo un acceso más.
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-400">
        +IVA (13%) · tipo de cambio de referencia BCCR ≈ ₡450/US$1 (setiembre 2026) · implementación inicial
        ₡75.000 (se exonera en contratos anuales) · precios de referencia, ajustables según volumen real.
      </p>
    </div>
  )
}
