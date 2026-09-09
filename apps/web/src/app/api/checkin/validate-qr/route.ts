import { NextRequest, NextResponse } from 'next/server'
import { validateQrToken } from '@/lib/qr-token'

// Lets the mobile app validate a scanned QR's rotating anti-fraud token
// before calling award_gym_checkin. The web scanner can validate this
// token in-process (it already imports qr-token.ts server-side via the
// /checkin page), but mobile has no access to QR_SECRET — embedding it
// in the app bundle would let anyone decompile it and mint tokens that
// never expire, defeating the whole point. No auth required: branch +
// token are exactly what the publicly-displayed QR already encodes.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const branch = body?.branch as string | undefined
  const token = body?.t as string | undefined

  if (!branch) {
    return NextResponse.json({ valid: false, reason: 'missing_branch' }, { status: 400 })
  }

  // Old QRs without a token still work during the rollout transition,
  // matching apps/web/src/app/checkin/page.tsx's own behavior.
  if (!token) {
    return NextResponse.json({ valid: true })
  }

  return NextResponse.json({ valid: validateQrToken(branch, token) })
}
