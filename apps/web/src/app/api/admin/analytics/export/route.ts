import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAnalyticsDataAction, getAllDetailedDataAction } from '@/app/admin/analytics/actions'

function fmtNum(n: number | null | undefined): number {
  if (n == null) return 0
  return Math.round(n * 100) / 100
}

function computeRange(period: string, from?: string | null, to?: string | null): { from: string; to: string } {
  if (period === 'custom' && from && to) return { from, to }
  const now = new Date()
  const toISO = now.toISOString()
  switch (period) {
    case '7d':  { const d = new Date(now); d.setDate(d.getDate() - 7);    return { from: d.toISOString(), to: toISO } }
    case '90d': { const d = new Date(now); d.setDate(d.getDate() - 90);   return { from: d.toISOString(), to: toISO } }
    case '6m':  { const d = new Date(now); d.setMonth(d.getMonth() - 6);  return { from: d.toISOString(), to: toISO } }
    case 'ytd': return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: toISO }
    case 'last_year': {
      const y = now.getFullYear() - 1
      return { from: new Date(y, 0, 1).toISOString(), to: new Date(y, 11, 31, 23, 59, 59).toISOString() }
    }
    default: { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: d.toISOString(), to: toISO } }
  }
}

function applyColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }))
}

function boldFirstRow(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[addr]) continue
    ws[addr].s = { font: { bold: true } }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? '30d'
  const { from, to } = computeRange(period, searchParams.get('from'), searchParams.get('to'))

  const [summaryResult, detailResult] = await Promise.all([
    getAnalyticsDataAction(from, to),
    getAllDetailedDataAction(from, to),
  ])

  if (summaryResult.error || !summaryResult.data) {
    return NextResponse.json({ error: summaryResult.error ?? 'No data' }, { status: 403 })
  }
  if (detailResult.error || !detailResult.data) {
    return NextResponse.json({ error: detailResult.error ?? 'No detail data' }, { status: 403 })
  }

  const { data } = summaryResult
  const detail   = detailResult.data
  const currency = data.currency
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Resumen Ejecutivo ────────────────────────────────────────────
  const periodLabel = `${from.slice(0, 10)} → ${to.slice(0, 10)}`
  const rows1 = [
    ['RESUMEN EJECUTIVO', '', periodLabel],
    [],
    ['KPI', 'Valor', 'Moneda'],
    ['MRR (Ingreso Recurrente Mensual)',    fmtNum(data.kpis.mrr),                  currency],
    ['ARR (Ingreso Recurrente Anual)',      fmtNum(data.kpis.arr),                  currency],
    ['ARPU (Ingreso por Usuario Activo)',   fmtNum(data.kpis.arpu),                 currency],
    ['Ticket promedio de suscripción',      fmtNum(data.kpis.avg_subscription_value), currency],
    ['Ingresos del período',                fmtNum(data.kpis.period_revenue),       currency],
    ['Ingresos período anterior',           fmtNum(data.kpis.prev_period_revenue),  currency],
    ['Ingresos acumulados (YTD)',           fmtNum(data.summary.ytd_revenue),       currency],
    ['Ingresos este mes',                   fmtNum(data.summary.this_month_revenue), currency],
    ['Ingresos mes anterior',               fmtNum(data.summary.last_month_revenue), currency],
    [],
    ['SUSCRIPCIONES', '', ''],
    ['Suscripciones activas (hoy)',         data.summary.active_subscriptions,      ''],
    ['Nuevas suscripciones en el período',  data.kpis.new_subscriptions,            ''],
    ['Canceladas en el período',            data.kpis.cancelled_subscriptions,      ''],
    ['Tasa de cancelación (%)',             fmtNum(data.kpis.churn_rate_pct),       '%'],
    ['Nuevas este mes',                     data.summary.new_subs_this_month,       ''],
    [],
    ['CLIENTES', '', ''],
    ['Clientes activos totales',            data.kpis.active_clients,               ''],
    ['Nuevos clientes este mes',            data.summary.new_clients_this_month,    ''],
    ['Aprobaciones pendientes',             data.summary.pending_approvals,         ''],
    [],
    ['CITAS', '', ''],
    ['Total citas en el período',           data.kpis.total_appointments,           ''],
    ['Citas completadas',                   data.kpis.completed_appointments,       ''],
    ['Citas canceladas',                    data.kpis.cancelled_appointments,       ''],
    ['Tasa de llenado (%)',                 fmtNum(data.kpis.appointment_fill_rate), '%'],
    ['Tasa de cancelación (%)',             fmtNum(data.kpis.cancellation_rate),    '%'],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(rows1)
  applyColWidths(ws1, [40, 18, 16])
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo')

  // ── Sheet 2: Clientes (detallado) ─────────────────────────────────────────
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Nombre', 'Email', 'Teléfono', 'Nivel', 'Sucursal', 'Estado aprobación', 'Activo',
     'Fecha registro', 'Ingresos totales', 'Suscr. activas', 'Total suscripciones',
     'Total citas', 'Citas completadas', 'Mediciones', 'Última cita', 'Última suscripción'],
    ...detail.clients.map(r => [
      r.full_name, r.email, r.phone ?? '', r.client_level ?? '', r.branch_name ?? '',
      r.approval_status, r.is_active ? 'Sí' : 'No',
      r.join_date?.slice(0, 10) ?? '',
      fmtNum(r.total_revenue), r.active_plans, r.total_subscriptions,
      r.total_appointments, r.completed_appointments, r.measurements_count,
      r.last_appointment_date?.slice(0, 10) ?? '',
      r.last_subscription_date?.slice(0, 10) ?? '',
    ]),
  ])
  applyColWidths(ws2, [28, 30, 16, 14, 20, 20, 8, 14, 18, 14, 18, 12, 18, 12, 14, 18])
  boldFirstRow(ws2)
  XLSX.utils.book_append_sheet(wb, ws2, 'Clientes')

  // ── Sheet 3: Transacciones / Facturas ─────────────────────────────────────
  const ws3 = XLSX.utils.aoa_to_sheet([
    ['N° Factura', 'Fecha', 'Cliente', 'Email', 'Plan', 'Ciclo facturación',
     `Monto (${currency})`, 'Estado', 'Referencia pago', 'Promoción aplicada', 'Descuento', 'ID Stripe suscripción'],
    ...detail.transactions.map(r => [
      r.invoice_number ?? '', r.invoice_date?.slice(0, 10) ?? '',
      r.client_name, r.client_email, r.plan_name, r.billing_cycle,
      fmtNum(r.amount), r.invoice_status, r.payment_reference ?? '',
      r.promotion_title ?? '', r.discount_applied ?? '', r.stripe_subscription_id ?? '',
    ]),
  ])
  applyColWidths(ws3, [16, 12, 28, 30, 24, 16, 16, 12, 22, 24, 12, 30])
  boldFirstRow(ws3)
  XLSX.utils.book_append_sheet(wb, ws3, 'Transacciones')

  // ── Sheet 4: Suscripciones ────────────────────────────────────────────────
  const ws4 = XLSX.utils.aoa_to_sheet([
    ['Inicio', 'Vencimiento', 'Cliente', 'Email', 'Plan', 'Ciclo', 'Estado',
     `Monto (${currency})`, 'Días restantes', 'Referencia pago', 'Promoción', 'ID Stripe suscripción'],
    ...detail.subscriptions.map(r => [
      r.start_date?.slice(0, 10) ?? '', r.end_date?.slice(0, 10) ?? '',
      r.client_name, r.client_email, r.plan_name, r.billing_cycle, r.status,
      fmtNum(r.amount), r.days_remaining ?? '', r.payment_reference ?? '',
      r.promotion_applied ?? '', r.stripe_subscription_id ?? '',
    ]),
  ])
  applyColWidths(ws4, [12, 12, 28, 30, 24, 12, 12, 16, 14, 22, 24, 30])
  boldFirstRow(ws4)
  XLSX.utils.book_append_sheet(wb, ws4, 'Suscripciones')

  // ── Sheet 5: Citas ────────────────────────────────────────────────────────
  const ws5 = XLSX.utils.aoa_to_sheet([
    ['Fecha/Hora inicio', 'Fecha/Hora fin', 'Título', 'Tipo', 'Estado',
     'Cliente', 'Email cliente', 'Coach', 'Ubicación', 'Duración (min)', 'Notas'],
    ...detail.appointments.map(r => [
      r.appointment_date?.slice(0, 16).replace('T', ' ') ?? '',
      r.end_time?.slice(0, 16).replace('T', ' ') ?? '',
      r.title ?? '', r.appointment_type ?? '', r.status,
      r.client_name ?? '', r.client_email ?? '', r.coach_name ?? '', r.location ?? '',
      r.duration_minutes ?? '', r.notes ?? '',
    ]),
  ])
  applyColWidths(ws5, [20, 20, 24, 16, 12, 28, 30, 28, 20, 14, 40])
  boldFirstRow(ws5)
  XLSX.utils.book_append_sheet(wb, ws5, 'Citas')

  // ── Sheet 6: Ingresos Mensuales ───────────────────────────────────────────
  const ws6 = XLSX.utils.aoa_to_sheet([
    ['Mes', `Ingresos (${currency})`, 'Suscripciones'],
    ...data.monthlyRevenue.map(r => [r.year_month, fmtNum(r.revenue), r.count]),
  ])
  applyColWidths(ws6, [12, 18, 16])
  boldFirstRow(ws6)
  XLSX.utils.book_append_sheet(wb, ws6, 'Ingresos Mensuales')

  // ── Sheet 7: Actividad Semanal ────────────────────────────────────────────
  const ws7 = XLSX.utils.aoa_to_sheet([
    ['Semana', 'Citas', 'Nuevas suscripciones', `Ingresos (${currency})`],
    ...data.weeklyActivity.map(r => [r.year_week, r.appointments, r.new_subscriptions, fmtNum(r.revenue)]),
  ])
  applyColWidths(ws7, [12, 10, 22, 18])
  boldFirstRow(ws7)
  XLSX.utils.book_append_sheet(wb, ws7, 'Actividad Semanal')

  // ── Sheet 8: Planes ───────────────────────────────────────────────────────
  const ws8 = XLSX.utils.aoa_to_sheet([
    ['#', 'Plan', 'Ventas en período', `Ingresos (${currency})`],
    ...data.topPlans.map((p, i) => [i + 1, p.plan_name, p.purchases, fmtNum(p.revenue)]),
  ])
  applyColWidths(ws8, [4, 30, 18, 18])
  boldFirstRow(ws8)
  XLSX.utils.book_append_sheet(wb, ws8, 'Planes')

  // ── Sheet 9: Promociones ──────────────────────────────────────────────────
  const ws9 = XLSX.utils.aoa_to_sheet([
    ['#', 'Promoción', 'Usos en período', `Descuento promedio (${currency})`],
    ...data.topPromotions.map((p, i) => [i + 1, p.promo_title, p.uses, fmtNum(p.avg_discount)]),
  ])
  applyColWidths(ws9, [4, 30, 18, 24])
  boldFirstRow(ws9)
  XLSX.utils.book_append_sheet(wb, ws9, 'Promociones')

  // ── Sheet 10: Sucursales ──────────────────────────────────────────────────
  const ws10 = XLSX.utils.aoa_to_sheet([
    ['Sucursal', 'Clientes', 'Coaches', 'Citas', `Ingresos (${currency})`],
    ...data.branches.map(b => [b.branch_name, b.clients, b.coaches, b.appointments, fmtNum(b.revenue)]),
  ])
  applyColWidths(ws10, [24, 10, 10, 10, 18])
  boldFirstRow(ws10)
  XLSX.utils.book_append_sheet(wb, ws10, 'Sucursales')

  // ── Sheet 11: Videos ──────────────────────────────────────────────────────
  const ws11 = XLSX.utils.aoa_to_sheet([
    ['#', 'Video', 'Asignaciones en período'],
    ...data.topVideos.map((v, i) => [i + 1, v.video_title, v.assignments]),
  ])
  applyColWidths(ws11, [4, 40, 22])
  boldFirstRow(ws11)
  XLSX.utils.book_append_sheet(wb, ws11, 'Videos')

  const buf  = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="analiticas-${period}-${date}.xlsx"`,
    },
  })
}
