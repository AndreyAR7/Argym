import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { generateQrToken, secondsUntilNextWindow } from '@/lib/qr-token'
import { MonitorDisplay } from './monitor-display'

export const metadata = { title: 'Monitor Check-in — ARGYM' }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-dominio.com'

interface Props {
  params: Promise<{ branchId: string }>
}

export default async function MonitorPage({ params }: Props) {
  const { branchId } = await params

  const supabase = await createAdminClient()
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', branchId)
    .eq('is_active', true)
    .single()

  if (!branch) notFound()

  const token      = generateQrToken(branchId)
  const checkinUrl = `${APP_URL}/checkin?branch=${branchId}&t=${token}`
  const qrDataUrl  = await QRCode.toDataURL(checkinUrl, {
    width: 420,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const expiresIn = secondsUntilNextWindow()

  return (
    <MonitorDisplay
      branchId={branchId}
      branchName={branch.name}
      initialQrUrl={qrDataUrl}
      initialCheckinUrl={checkinUrl}
      initialExpiresIn={expiresIn}
    />
  )
}
