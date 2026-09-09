import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getSessionData } from '@/lib/auth/session'

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

const RESULT_LABELS: Record<string, string> = {
  success: 'Exitoso',
  already_checked_in: 'Ya registrado',
  no_active_membership: 'Sin membresía',
  weekly_limit_reached: 'Límite semanal alcanzado',
  branch_not_in_tenant: 'Sucursal inválida',
  user_not_approved: 'No aprobado',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10)
  const result = searchParams.get('result')
  const branch = searchParams.get('branch')

  const session = await getSessionData()
  const { supabase, tenantId } = session!

  let query = supabase
    .from('checkin_attempts')
    .select(`
      created_at, result, weekly_limit, weekly_count,
      user:profiles!checkin_attempts_user_id_fkey(full_name),
      branch:branches!checkin_attempts_branch_id_fkey(name),
      plan:plans!checkin_attempts_plan_id_fkey(name)
    `)
    .eq('tenant_id', tenantId)
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })

  if (result) query = query.eq('result', result)
  if (branch) query = query.eq('branch_id', branch)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = [
    ['Cliente', 'Fecha', 'Sucursal', 'Plan', 'Resultado', 'Uso semanal', 'Límite semanal'],
    ...((data ?? []) as any[]).map(a => [
      Array.isArray(a.user) ? a.user[0]?.full_name : a.user?.full_name ?? '—',
      new Date(a.created_at).toLocaleString('es-CR'),
      Array.isArray(a.branch) ? a.branch[0]?.name : a.branch?.name ?? '—',
      Array.isArray(a.plan) ? a.plan[0]?.name : a.plan?.name ?? '—',
      RESULT_LABELS[a.result] ?? a.result,
      a.weekly_count ?? '',
      a.weekly_limit ?? 'Ilimitado',
    ]),
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  applyColWidths(ws, [26, 20, 18, 22, 20, 12, 14])
  boldFirstRow(ws)
  XLSX.utils.book_append_sheet(wb, ws, 'Check-ins')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="checkins-${from}-${to}.xlsx"`,
    },
  })
}
