import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTenantPlans,
  getClientSubscription,
  assignPlanToClient,
} from '@/services/subscriptions.service';
import { PROFILES_KEYS, CLIENTS_WITH_PLAN_KEY } from '@/hooks/useProfiles';

export const SUBSCRIPTION_KEYS = {
  plans: ['subscriptions', 'plans'] as const,
  clientSub: (userId: string) => ['subscriptions', 'client', userId] as const,
};

export function useTenantPlans() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.plans,
    queryFn: getTenantPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientSubscription(userId: string | undefined) {
  return useQuery({
    queryKey: SUBSCRIPTION_KEYS.clientSub(userId ?? ''),
    queryFn: () => getClientSubscription(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAssignPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      tenantId,
      planId,
      planPrice,
    }: {
      userId: string;
      tenantId: string;
      planId: string;
      planPrice: number;
    }) => assignPlanToClient(userId, tenantId, planId, planPrice),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTION_KEYS.clientSub(userId) });
      qc.invalidateQueries({ queryKey: PROFILES_KEYS.clients });
      qc.invalidateQueries({ queryKey: CLIENTS_WITH_PLAN_KEY });
    },
  });
}
