import { useMutation } from '@tanstack/react-query';
import { sendClientInvitation, type SendInvitationInput } from '@/services/invitations.service';

export function useSendClientInvitation() {
  return useMutation({
    mutationFn: (input: SendInvitationInput) => sendClientInvitation(input),
  });
}
