import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteLanding } from './_components/invite-landing'

export const metadata = { title: 'Invitación' }

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invitation } = await supabase
    .rpc('get_invitation_by_token', { p_token: token })
    .maybeSingle() as { data: {
      email: string; full_name: string; status: string
      tenant_name: string; tenant_slug: string; tenant_logo_url: string | null
    } | null }

  if (!invitation) notFound()

  return (
    <InviteLanding
      token={token}
      email={invitation.email}
      fullName={invitation.full_name}
      status={invitation.status}
      tenantName={invitation.tenant_name}
      tenantSlug={invitation.tenant_slug}
    />
  )
}
