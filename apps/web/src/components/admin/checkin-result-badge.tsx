const STYLE: Record<string, { label: string; bg: string; color: string }> = {
  success:               { label: 'Exitoso',         bg: 'color-mix(in srgb, #22c55e 12%, transparent)', color: '#16a34a' },
  already_checked_in:    { label: 'Ya registrado',   bg: 'color-mix(in srgb, #6b7280 12%, transparent)', color: '#4b5563' },
  no_active_membership:  { label: 'Sin membresía',   bg: 'color-mix(in srgb, #ef4444 12%, transparent)', color: '#dc2626' },
  weekly_limit_reached:  { label: 'Límite semanal',  bg: 'color-mix(in srgb, #f59e0b 12%, transparent)', color: '#b45309' },
  branch_not_in_tenant:  { label: 'Sucursal inválida', bg: 'color-mix(in srgb, #ef4444 12%, transparent)', color: '#dc2626' },
  user_not_approved:     { label: 'No aprobado',     bg: 'color-mix(in srgb, #ef4444 12%, transparent)', color: '#dc2626' },
}

export function CheckinResultBadge({ result }: { result: string }) {
  const s = STYLE[result] ?? { label: result, bg: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
