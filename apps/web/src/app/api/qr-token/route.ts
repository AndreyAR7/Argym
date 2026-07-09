import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getSessionData } from '@/lib/auth/session'
import { generateQrToken, secondsUntilNextWindow } from '@/lib/qr-token'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-dominio.com'

export async function GET(req: NextRequest) {
  const session = await getSessionData()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const branchId = req.nextUrl.searchParams.get('branchId')
  if (!branchId) {
    return NextResponse.json({ error: 'Falta branchId' }, { status: 400 })
  }

  // Verify the branch belongs to this tenant
  const { supabase, tenantId } = session
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', branchId)
    .eq('tenant_id', tenantId)
    .single()

  if (!branch) {
    return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })
  }

  const token     = generateQrToken(branchId)
  const url       = `${APP_URL}/checkin?branch=${branchId}&t=${token}`
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 220,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const expiresIn = secondsUntilNextWindow()

  return NextResponse.json({ token, qrDataUrl, url, expiresIn })
}
