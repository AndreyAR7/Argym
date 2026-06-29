import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAnalyticsDataAction } from '@/app/admin/analytics/actions'

function fmtNum(n: number): number {
  return Math.round(n * 100) / 100
}

export async function GET() {
  const { data, error } = await getAnalyticsDataAction()

  if (error || !data) {
    return NextResponse.json({ error: error ?? 'No data' }, { status: 403 })
  }

  const wb = XLSX.utils.book_new()
  const currency = data.currency

  // ── Sheet 1: Resumen ────────────────────────────────────────────
  const summaryRows = [
    ['Métrica', 'Valor'],
    ['Ingresos totales', fmtNum(data.summary.total_revenue)],
    ['Ingresos este mes', fmtNum(data.summary.this_month_revenue)],
    ['Ingresos mes anterior', fmtNum(data.summary.last_month_revenue)],
    ['Ingresos año actual (YTD)', fmtNum(data.summary.ytd_revenue)],
    ['Suscripciones activas', data.summary.active_subscriptions],
    ['Nuevas suscripciones este mes', data.summary.new_subs_this_month],
    ['Clientes activos', data.summary.total_clients],
    ['Nuevos clientes este mes', data.summary.new_clients_this_month],
    ['Aprobaciones pendientes', data.summary.pending_approvals],
    ['Moneda', currency],
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 32 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen')

  // ── Sheet 2: Ingresos mensuales ─────────────────────────────────
  const monthlyRows = [
    ['Mes', `Ingresos (${currency})`, 'Suscripciones'],
    ...data.monthlyRevenue.map(r => [r.year_month, fmtNum(r.revenue), r.count]),
  ]
  const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyRows)
  monthlySheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, monthlySheet, 'Ingresos Mensuales')

  // ── Sheet 3: Actividad semanal ──────────────────────────────────
  const weeklyRows = [
    ['Semana', 'Citas', 'Nuevas Suscripciones', `Ingresos (${currency})`],
    ...data.weeklyActivity.map(r => [r.year_week, r.appointments, r.new_subscriptions, fmtNum(r.revenue)]),
  ]
  const weeklySheet = XLSX.utils.aoa_to_sheet(weeklyRows)
  weeklySheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, weeklySheet, 'Actividad Semanal')

  // ── Sheet 4: Planes ─────────────────────────────────────────────
  const plansRows = [
    ['#', 'Plan', 'Ventas', `Ingresos (${currency})`],
    ...data.topPlans.map((p, i) => [i + 1, p.plan_name, p.purchases, fmtNum(p.revenue)]),
  ]
  const plansSheet = XLSX.utils.aoa_to_sheet(plansRows)
  plansSheet['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, plansSheet, 'Planes')

  // ── Sheet 5: Promociones ────────────────────────────────────────
  const promosRows = [
    ['#', 'Promoción', 'Usos', `Descuento promedio (${currency})`],
    ...data.topPromotions.map((p, i) => [i + 1, p.promo_title, p.uses, fmtNum(p.avg_discount)]),
  ]
  const promosSheet = XLSX.utils.aoa_to_sheet(promosRows)
  promosSheet['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 8 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, promosSheet, 'Promociones')

  // ── Sheet 6: Clientes top ───────────────────────────────────────
  const usersRows = [
    ['#', 'Cliente', `Ingresos (${currency})`, 'Suscripciones', 'Citas', 'Mediciones'],
    ...data.topUsers.map((u, i) => [
      i + 1, u.full_name, fmtNum(u.revenue), u.subscriptions, u.appointments, u.measurements,
    ]),
  ]
  const usersSheet = XLSX.utils.aoa_to_sheet(usersRows)
  usersSheet['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, usersSheet, 'Clientes Top')

  // ── Sheet 7: Sucursales ─────────────────────────────────────────
  const branchRows = [
    ['Sucursal', 'Clientes', 'Coaches', 'Citas', `Ingresos (${currency})`],
    ...data.branches.map(b => [b.branch_name, b.clients, b.coaches, b.appointments, fmtNum(b.revenue)]),
  ]
  const branchSheet = XLSX.utils.aoa_to_sheet(branchRows)
  branchSheet['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, branchSheet, 'Sucursales')

  // ── Sheet 8: Videos ─────────────────────────────────────────────
  const videoRows = [
    ['#', 'Video', 'Asignaciones'],
    ...data.topVideos.map((v, i) => [i + 1, v.video_title, v.assignments]),
  ]
  const videoSheet = XLSX.utils.aoa_to_sheet(videoRows)
  videoSheet['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, videoSheet, 'Videos')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="analytics-${date}.xlsx"`,
    },
  })
}
