import { supabase } from '@/lib/supabase';

export interface SendInvitationInput {
  email: string;
  fullName: string;
  tenantId: string;
  invitedBy: string;
}

// Mirrors apps/web/src/lib/admin/client-invitation-actions.ts — same table,
// same edge function, same auto-approval trigger (handle_new_user in
// migration 20240101000197). A re-invite refreshes the existing pending
// row instead of erroring on the tenant+email unique index.
export async function sendClientInvitation(input: SendInvitationInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email || !fullName) throw new Error('Correo y nombre son requeridos.');

  const { data: existing } = await supabase
    .from('client_invitations')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('status', 'pending')
    .ilike('email', email)
    .maybeSingle();

  let invitationId: string;
  if (existing) {
    const { error } = await supabase
      .from('client_invitations')
      .update({
        full_name: fullName,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
    invitationId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from('client_invitations')
      .insert({ tenant_id: input.tenantId, email, full_name: fullName, invited_by: input.invitedBy })
      .select('id')
      .single();
    if (error) throw error;
    invitationId = inserted.id;
  }

  const { data: result, error: fnError } = await supabase.functions.invoke('send-communication', {
    body: { event_type: 'client.invitation', tenant_id: input.tenantId, invitation_id: invitationId },
  });
  if (fnError) throw new Error(`Invitación creada, pero el correo falló: ${fnError.message}`);
  if (result?.status === 'failed') throw new Error('Invitación creada, pero el envío del correo falló. Intenta reenviar.');
}
