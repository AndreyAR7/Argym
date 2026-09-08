import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfilesByRole,
  updateProfile,
  toggleProfileActive,
  createUser,
  getClientsWithPlan,
  getClientsWithPlanPage,
  getCoachClients,
  CLIENTS_PAGE_SIZE,
  type UpdateProfileInput,
  type CreateUserInput,
} from '@/services/profiles.service';

export const PROFILES_KEYS = {
  clients: ['profiles', 'clients'] as const,
  coaches: ['profiles', 'coaches'] as const,
  coachClients: (coachId: string) => ['profiles', 'coach-clients', coachId] as const,
};

export const CLIENTS_WITH_PLAN_KEY = ['profiles', 'clients-with-plan'] as const;

export function useClients() {
  return useQuery({
    queryKey: PROFILES_KEYS.clients,
    queryFn: () => getProfilesByRole('client'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCoaches() {
  return useQuery({
    queryKey: PROFILES_KEYS.coaches,
    queryFn: () => getProfilesByRole('coach'),
    staleTime: 2 * 60 * 1000,
  });
}

// Clients assigned to a specific coach (coach_client_assignments) —
// used by the coach's own appointment-creation flow, unlike useClients()
// which returns every client in the tenant.
export function useCoachClients(coachId: string | undefined) {
  return useQuery({
    queryKey: PROFILES_KEYS.coachClients(coachId ?? ''),
    queryFn: () => getCoachClients(coachId!),
    enabled: !!coachId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useClientsWithPlan() {
  return useQuery({
    queryKey: CLIENTS_WITH_PLAN_KEY,
    queryFn: getClientsWithPlan,
    staleTime: 2 * 60 * 1000,
  });
}

export const CLIENTS_INFINITE_KEY = ['profiles', 'clients-with-plan-infinite'] as const;

export function useClientsWithPlanInfinite() {
  return useInfiniteQuery({
    queryKey: CLIENTS_INFINITE_KEY,
    queryFn: ({ pageParam }) => getClientsWithPlanPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === CLIENTS_PAGE_SIZE ? allPages.length : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateProfile(role: 'client' | 'coach') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProfileInput }) =>
      updateProfile(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: role === 'client' ? PROFILES_KEYS.clients : PROFILES_KEYS.coaches });
      qc.invalidateQueries({ queryKey: CLIENTS_WITH_PLAN_KEY });
      qc.invalidateQueries({ queryKey: CLIENTS_INFINITE_KEY });
    },
  });
}

export function useToggleProfileActive(role: 'client' | 'coach') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleProfileActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: role === 'client' ? PROFILES_KEYS.clients : PROFILES_KEYS.coaches });
    },
  });
}

export function useCreateUser(role: 'client' | 'coach') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: role === 'client' ? PROFILES_KEYS.clients : PROFILES_KEYS.coaches });
      qc.invalidateQueries({ queryKey: CLIENTS_WITH_PLAN_KEY });
      qc.invalidateQueries({ queryKey: CLIENTS_INFINITE_KEY });
    },
  });
}
