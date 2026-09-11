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

const SLIDER_MIN = 20
const SLIDER_MAX = 800

export function PricingCalculator() {
  const [clients, setClients] = useState(150)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const recommended = useMemo(
    () => PLANS.find((p) => p.monthly !== null && clients <= p.cap) ?? PLANS[2],
    [clients],
  )

  const pct = ((clients - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100

  return (
    <div>
      <style jsx>{`
        .gym-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
        }
        .gym-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 5px solid #6366f1;
          box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.28), 0 6px 16px rgba(0, 0, 0, 0.5);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .gym-range:hover::-webkit-slider-thumb {
          transform: scale(1.12);
          box-shadow: 0 0 0 9px rgba(99, 102, 241, 0.34), 0 6px 18px rgba(0, 0, 0, 0.55);
        }
        .gym-range:active::-webkit-slider-thumb {
          transform: scale(1.22);
        }
        .gym-range::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 5px solid #6366f1;
          box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.28), 0 6px 16px rgba(0, 0, 0, 0.5);
          cursor: pointer;
        }
        .gym-range::-moz-range-track {
          background: transparent;
        }
      `}</style>

      <div className="relative mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-[260px] flex-1">
            <label htmlFor="client-slider" className="text-sm font-bold text-white">
              ¿Cuántos clientes activos tiene tu gimnasio? —{' '}
              <span className="text-indigo-400">{clients}</span>
            </label>
            <input
              id="client-slider"
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={10}
              value={clients}
              onChange={(e) => setClients(Number(e.target.value))}
              className="gym-range mt-5 w-full"
              style={{
                background: `linear-gradient(90deg, #818cf8 0%, #a78bfa ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-[10.5px] font-medium text-gray-500">
              <span>{SLIDER_MIN}</span>
              <span>400</span>
              <span>{SLIDER_MAX}+</span>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Con <b className="text-white">{clients}</b> clientes activos te recomendamos{' '}
              <b className="text-emerald-400">{recommended?.name}</b>.
            </p>
          </div>
          <div>
            <div className="relative inline-flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`relative z-10 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  billing === 'monthly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  billing === 'annual' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Anual
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-400">
                  -17%
                </span>
              </button>
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-indigo-600 shadow-[0_0_16px_rgba(99,102,241,0.5)] transition-transform duration-300 ease-out"
                style={{ transform: billing === 'annual' ? 'translateX(calc(100% + 4px))' : 'translateX(0)' }}
              />
            </div>
            <p className="mt-2 max-w-[30ch] text-[11px] leading-relaxed text-gray-500">
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
              className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 ${
                plan.featured
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.4),0_20px_40px_-12px_rgba(99,102,241,0.5)] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.6),0_24px_48px_-12px_rgba(99,102,241,0.65)]'
                  : plan.dark
                    ? 'border-white/15 bg-white/[0.03] text-white'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
              } ${isRecommended ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600">
                  MÁS ELEGIDO
                </span>
              )}
              {isRecommended && !plan.featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
                  TU PLAN
                </span>
              )}
              <span className={`text-xs font-bold uppercase tracking-wide ${inverted ? 'text-white/70' : 'text-gray-500'}`}>
                {plan.name}
              </span>

              {monthlyEq !== null ? (
                <>
                  <div className="mt-2 text-[26px] font-extrabold leading-none text-white">
                    ₡{monthlyEq.toLocaleString('es-CR')}
                    <small className={`ml-1 text-xs font-semibold ${inverted ? 'text-white/60' : 'text-gray-500'}`}>/mes</small>
                  </div>
                  <div className={`mt-1 text-[11.5px] ${inverted ? 'text-white/60' : 'text-gray-500'}`}>≈ US${plan.usd}/mes</div>
                  {billing === 'annual' && (
                    <div className={`mt-1 text-[11px] font-semibold ${plan.featured ? 'text-emerald-200' : 'text-emerald-400'}`}>
                      ₡{(plan.monthly! * 10).toLocaleString('es-CR')}/año · ahorrás ₡{(plan.monthly! * 2).toLocaleString('es-CR')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-2 text-[26px] font-extrabold leading-none text-white">Cotización</div>
                  <div className="mt-1 text-[11.5px] text-white/60">a medida</div>
                </>
              )}

              <div className={`mt-3.5 border-t pt-3.5 text-[12.5px] ${inverted ? 'border-white/20 text-white/70' : 'border-white/10 text-gray-400'}`}>
                {plan.scope}
              </div>
              <ul className="mt-3 flex-1 space-y-2">
                {plan.perks.map((perk, i) => (
                  <li key={i} className={`relative pl-3.5 text-[12.5px] ${inverted ? 'text-white/80' : 'text-gray-400'}`}>
                    <span className="absolute left-0">—</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-[13.5px] leading-relaxed text-gray-400">
        <b className="text-white">Por qué estos precios:</b> software equivalente en Estados Unidos parte de
        US$79–139/mes (Mindbody), US$110/mes (Glofox) o US$179/mes (Wodify) — sin incluir facturación en dos
        niveles ni una app móvil propia con experiencias distintas para admin, coach y cliente. En Costa Rica,
        los proveedores locales (Gym&amp;i, XCORE, ABC Evo) no publican precio y cotizan a medida; ser
        transparente con el precio ya es una ventaja. Como referencia de valor: el plan Arranque cuesta
        aproximadamente lo mismo que dos membresías mensuales de un gimnasio promedio en el país
        (≈₡25.000–₡40.000 cada una) — y reemplaza la gestión completa del negocio, no solo un acceso más.
      </div>
      <p className="mt-3 text-center text-[11px] text-gray-500">
        +IVA (13%) · tipo de cambio de referencia BCCR ≈ ₡450/US$1 (setiembre 2026) · implementación inicial
        ₡75.000 (se exonera en contratos anuales) · precios de referencia, ajustables según volumen real.
      </p>
    </div>
  )
}
