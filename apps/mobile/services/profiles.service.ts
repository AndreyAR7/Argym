import { supabase } from '@/lib/supabase';

export interface ProfileRecord {
  id: string;
  tenant_id: string;
  full_name: string;
  phone?: string | null;
  date_of_birth?: string | null;
  is_active: boolean;
  approval_status?: string | null;
  avatar_url?: string | null;
  client_level?: 'beginner' | 'intermediate' | 'advanced' | null;
  created_at?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  is_active?: boolean;
  client_level?: 'beginner' | 'intermediate' | 'advanced' | null;
}

export const CLIENT_LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

// ── Client with plan (for appointment selector) ───────────────
export interface ClientWithPlan {
  id: string;
  full_name: string;
  client_level?: string | null;
  plan_name?: string | null;
  plan_tier?: string | null;
  promotion_id?: string | null;
  promotion_title?: string | null;
  is_active?: boolean;
  approval_status?: string | null;
  created_at?: string;
}

export const CLIENTS_PAGE_SIZE = 25;

export async function getClientsWithPlan(): Promise<ClientWithPlan[]> {
  const { data, error } = await supabase.rpc('get_clients_with_plan');
  if (error) throw error;
  return (data ?? []) as ClientWithPlan[];
}

export async function getClientsWithPlanPage(page: number): Promise<ClientWithPlan[]> {
  const from = page * CLIENTS_PAGE_SIZE;
  const to = from + CLIENTS_PAGE_SIZE - 1;
  const { data, error } = await supabase.rpc('get_clients_with_plan').range(from, to);
  if (error) throw error;
  return (data ?? []) as ClientWithPlan[];
}

// ── List profiles by role (uses SECURITY DEFINER RPC) ────────
export async function getProfilesByRole(roleName: 'client' | 'coach'): Promise<ProfileRecord[]> {
  const { data, error } = await supabase.rpc('get_profiles_by_role', { role_name: roleName });
  if (error) throw error;
  return (data ?? []) as ProfileRecord[];
}

// ── Update a profile (admin/coach via SECURITY DEFINER RPC) ──
// Direct .update() on profiles is blocked by RLS for cross-user updates.
// The RPC validates that the caller is staff in the same tenant.
export async function updateProfile(id: string, input: UpdateProfileInput): Promise<ProfileRecord> {
  const { data, error } = await supabase.rpc('update_profile_by_staff', {
    p_target_user_id:     id,
    p_full_name:          input.full_name     ?? null,
    p_phone:              input.phone         ?? null,
    p_date_of_birth:      input.date_of_birth ?? null,
    p_client_level:       input.client_level  ?? null,
    p_clear_client_level: input.client_level  === null,
    p_is_active:          input.is_active     ?? null,
  });

  if (error) throw error;

  // RPC returns SETOF profiles — take the first (and only) row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Profile not found or update failed');
  return row as ProfileRecord;
}

// ── Toggle active status ──────────────────────────────────────
export async function toggleProfileActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: 'client' | 'coach';
  phone?: string;
  date_of_birth?: string;
}

// ── Create user via Edge Function (requires service role on backend) ──
export async function createUser(input: CreateUserInput): Promise<ProfileRecord> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: input,
  });

  if (error) {
    // supabase.functions.invoke wraps HTTP errors — extract message
    const msg = (data as any)?.error ?? error.message ?? 'Error al crear usuario';
    throw new Error(msg);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ProfileRecord;
}
