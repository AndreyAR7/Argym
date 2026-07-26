import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData } from '@/lib/auth/session'
import { validateQrToken } from '@/lib/qr-token'
import { CheckinResult } from './checkin-result'

export const metadata = { title: 'Check-in' }

// Fire-and-forget notice to the branch's /monitor screen (Realtime Broadcast,
// not a DB table — the monitor has no user session, so this avoids needing
// any RLS change to let an anonymous kiosk read gym_checkins directly).
async function broadcastCheckin(branchId: string, payload: { name: string; avatar_url: string | null }) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `checkin-feed:branch:${branchId}`, event: 'checkin', payload, private: false }],
      }),
    })
  } catch {
    // Best-effort — never block the check-in confirmation on the monitor feed
  }
}

interface Props {
  searchParams: Promise<{ branch?: string; t?: string }>
}

export default async function CheckinPage({ searchParams }: Props) {
  const { branch, t } = await searchParams

  // Invalid QR — no branch param
  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">QR inválido</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este código QR no corresponde a ninguna sucursal. Escanea el QR oficial del gimnasio.
          </p>
        </div>
      </div>
    )
  }

  // Validate dynamic token (if present — old QRs without token still work during transition)
  if (t && !validateQrToken(branch, t)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⏱️</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">QR expirado</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este código QR ya no es válido. Escanea el QR actual que se muestra en la entrada del gimnasio.
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Los códigos se renuevan cada 5 minutos para evitar fraudes.
          </p>
        </div>
      </div>
    )
  }

  // Auth check
  const session = await getSessionData()
  if (!session) {
    redirect(`/login?redirect=/checkin?branch=${branch}${t ? `&t=${t}` : ''}`)
  }

  const { supabase, user, tenantId } = session

  // Verify the branch belongs to the user's tenant before calling the RPC.
  // This prevents cross-gym check-ins (e.g. Golds Gym member scanning Angulo Gym QR).
  const { data: branchRow } = await supabase
    .from('branches')
    .select('id')
    .eq('id', branch)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!branchRow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">QR de otro gimnasio</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este código QR pertenece a una sucursal que no es de tu gimnasio. Solo puedes hacer check-in en las sucursales de tu gimnasio registrado.
          </p>
          <a
            href="/client/inicio"
            className="inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  // Call the check-in RPC
  const { data, error } = await supabase.rpc('award_gym_checkin', {
    p_user_id: user.id,
    p_tenant_id: tenantId,
    p_branch_id: branch,
  })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Error al registrar</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No se pudo registrar tu check-in. Intenta de nuevo o pide ayuda al staff.
          </p>
          <p className="text-xs font-mono text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-3 py-2 rounded-lg">
            {error.message}
          </p>
          <Link
            href="/client/inicio"
            className="inline-block mt-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const result = Array.isArray(data) ? data[0] : data

  // Only announce genuinely new check-ins — not repeat scans of an
  // already-checked-in-today client — so the monitor doesn't show the same
  // person twice for one visit.
  if (result?.success) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    await broadcastCheckin(branch, {
      name: profile?.full_name ?? 'Un cliente',
      avatar_url: profile?.avatar_url ?? null,
    })
  }

  return <CheckinResult result={result} />
}
