import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { AppErrorCode } from '@/lib/types';
import type { Profile, PrimaryRole } from '@/lib/types';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string };
}

interface AuthState {
  user: Profile | null;
  session: Session | null;
  permissions: string[];
  approvalStatus: ApprovalStatus | null;
  rejectionReason: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  clearError: () => void;
}

async function fetchProfile(userId: string): Promise<Profile & { approval_status: ApprovalStatus; rejection_reason: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { code: AppErrorCode.NOT_FOUND, message: 'Perfil no encontrado' };
  }

  // Only load role if approved
  let primaryRole: PrimaryRole | undefined;
  if (data.approval_status === 'approved') {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .limit(1)
      .single();
    primaryRole = (roleData as any)?.roles?.name as PrimaryRole | undefined;
  }

  return { ...data, primaryRole } as any;
}

async function fetchPermissions(userId: string, tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  if (!data) return [];
  const codes: string[] = [];
  for (const ur of data as any[]) {
    for (const rp of ur.roles?.role_permissions ?? []) {
      const code = rp.permissions?.code;
      if (code && !codes.includes(code)) codes.push(code);
    }
  }
  return codes;
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  user: null,
  session: null,
  permissions: [],
  approvalStatus: null,
  rejectionReason: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isLoading: false });
        return;
      }
      const profile = await fetchProfile(session.user.id);
      const approvalStatus = (profile as any).approval_status as ApprovalStatus ?? 'pending';
      const rejectionReason = (profile as any).rejection_reason ?? null;

      // Only load permissions if approved
      const permissions = approvalStatus === 'approved'
        ? await fetchPermissions(session.user.id, profile.tenant_id)
        : [];

      set({
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at ?? 0,
          user: { id: session.user.id, email: session.user.email ?? '' },
        },
        user: profile,
        permissions,
        approvalStatus,
        rejectionReason,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, user: null, session: null, permissions: [], approvalStatus: null });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.status === 429
          ? 'auth.errors.rateLimitExceeded'
          : 'auth.errors.invalidCredentials';
        set({ isLoading: false, error: msg });
        throw error;
      }
      const profile = await fetchProfile(data.user.id);
      const approvalStatus = (profile as any).approval_status as ApprovalStatus ?? 'pending';
      const rejectionReason = (profile as any).rejection_reason ?? null;

      const permissions = approvalStatus === 'approved'
        ? await fetchPermissions(data.user.id, profile.tenant_id)
        : [];

      set({
        session: {
          access_token: data.session!.access_token,
          refresh_token: data.session!.refresh_token,
          expires_at: data.session!.expires_at ?? 0,
          user: { id: data.user.id, email: data.user.email ?? '' },
        },
        user: profile,
        permissions,
        approvalStatus,
        rejectionReason,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      if (!get().error) set({ isLoading: false, error: 'auth.errors.generic' });
      throw err;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, permissions: [], approvalStatus: null, rejectionReason: null, error: null, isLoading: false });
  },

  hasPermission: (code) => get().permissions.includes(code),
  clearError: () => set({ error: null }),
}));
