import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAppointmentsByTenant,
  getAppointmentsByClient,
  getAppointmentsByCoach,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} from '@/services/appointments.service';
import type { CreateAppointmentInput, UpdateAppointmentInput } from '@/types/appointments';

export const APPOINTMENTS_KEYS = {
  tenant: (tenantId: string) => ['appointments', 'tenant', tenantId] as const,
  client: (userId: string) => ['appointments', 'client', userId] as const,
  coach: (userId: string) => ['appointments', 'coach', userId] as const,
  detail: (id: string) => ['appointments', 'detail', id] as const,
};

export function useAppointmentsAdmin(tenantId: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.tenant(tenantId ?? ''),
    queryFn: () => getAppointmentsByTenant(tenantId!),
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAppointmentsClient(userId: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.client(userId ?? ''),
    queryFn: () => getAppointmentsByClient(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAppointmentsCoach(userId: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.coach(userId ?? ''),
    queryFn: () => getAppointmentsByCoach(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateAppointment(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: () => {
      if (tenantId) qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.tenant(tenantId) });
    },
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: APPOINTMENTS_KEYS.detail(id ?? ''),
    queryFn: () => getAppointmentById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAppointment(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAppointmentInput }) =>
      updateAppointment(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.detail(id) });
      if (tenantId) qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.tenant(tenantId) });
    },
  });
}

// Client-side update — invalidates by client userId
export function useUpdateAppointmentClient(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAppointmentInput }) =>
      updateAppointment(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.detail(id) });
      if (userId) qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.client(userId) });
    },
  });
}

export function useCancelAppointment(tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      if (tenantId) qc.invalidateQueries({ queryKey: APPOINTMENTS_KEYS.tenant(tenantId) });
    },
  });
}
