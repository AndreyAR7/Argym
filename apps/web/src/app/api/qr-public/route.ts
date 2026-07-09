import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { generateQrToken, secondsUntilNextWindow } from '@/lib/qr-token'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-dominio.com'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get('branchId')
  if (!branchId || !UUID_RE.test(branchId)) {
    return NextResponse.json({ error: 'branchId inválido' }, { status: 400 })
  }

  const token     = generateQrToken(branchId)
  const url       = `${APP_URL}/checkin?branch=${branchId}&t=${token}`
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 420,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const expiresIn = secondsUntilNextWindow()

  return NextResponse.json({ token, qrDataUrl, url, expiresIn })
}
