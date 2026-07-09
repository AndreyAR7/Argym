import { createHmac } from 'crypto'

const SECRET         = process.env.QR_SECRET ?? 'dev-qr-secret-change-in-production'
const WINDOW_SECONDS = 300 // 5 minutes per token

function windowAt(offsetWindows = 0): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS) + offsetWindows
}

export function generateQrToken(branchId: string, offsetWindows = 0): string {
  return createHmac('sha256', SECRET)
    .update(`${branchId}:${windowAt(offsetWindows)}`)
    .digest('hex')
    .slice(0, 32)
}

/** Accepts the current window and the previous one (grace period at rotation boundary). */
export function validateQrToken(branchId: string, token: string): boolean {
  return [0, -1].some(offset => generateQrToken(branchId, offset) === token)
}

/** Seconds until the current window expires. */
export function secondsUntilNextWindow(): number {
  const now = Math.floor(Date.now() / 1000)
  return WINDOW_SECONDS - (now % WINDOW_SECONDS)
}

export { WINDOW_SECONDS }
