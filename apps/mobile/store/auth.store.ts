import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { AppErrorCode } from '@/lib/types';
import { registerPushToken, unregisterPushToken } from '@/lib/pushNotifications';
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
  refreshIfNeeded: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  clearError: () => void;
}

interface RawProfile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  date_of_birth: string | null;
  client_level: string | null;
  created_at: string;
  updated_at: string;
}

interface RawUserRole {
  roles: {
    name: string;
    role_permissions: Array<{
      permissions: { code: string } | null;
    }>;
  } | null;
}

async function fetchProfile(userId: string): Promise<RawProfile & { primaryRole?: PrimaryRole }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { code: AppErrorCode.NOT_FOUND, message: 'Perfil no encontrado' };
  }

  const profile = data as RawProfile;

  let primaryRole: PrimaryRole | undefined;
  if (profile.approval_status === 'approved') {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId)
      .limit(1)
      .single();
    const typed = roleData as { roles: { name: string } | null } | null;
    primaryRole = typed?.roles?.name as PrimaryRole | undefined;
  }

  return { ...profile, primaryRole };
}

async function fetchPermissions(userId: string, tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  if (!data) return [];

  const codes: string[] = [];
  for (const ur of data as unknown as RawUserRole[]) {
    for (const rp of ur.roles?.role_permissions ?? []) {
      const code = rp.permissions?.code;
      if (code && !codes.includes(code)) codes.push(code);
    }
  }
  return codes;
}

const TOKEN_REFRESH_BUFFER_SECONDS = 60;

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

      // Refresh token on boot if it expires soon
      let activeSession = session;
      const expiresAt = session.expires_at ?? 0;
      if (expiresAt - Date.now() / 1000 < TOKEN_REFRESH_BUFFER_SECONDS) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) activeSession = refreshed.session;
      }

      const profile = await fetchProfile(activeSession.user.id);
      const approvalStatus = profile.approval_status ?? 'pending';
      const rejectionReason = profile.rejection_reason ?? null;
      const permissions = approvalStatus === 'approved'
        ? await fetchPermissions(activeSession.user.id, profile.tenant_id)
        : [];

      set({
        session: {
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
          expires_at: activeSession.expires_at ?? 0,
          user: { id: activeSession.user.id, email: activeSession.user.email ?? '' },
        },
        user: profile as unknown as Profile,
        permissions,
        approvalStatus,
        rejectionReason,
        isLoading: false,
      });

      // Keep session in sync with Supabase auth state changes (token refresh, sign-out)
      supabase.auth.onAuthStateChange((event, updatedSession) => {
        if (event === 'TOKEN_REFRESHED' && updatedSession) {
          set((state) => ({
            session: state.session
              ? {
                  ...state.session,
                  access_token: updatedSession.access_token,
                  refresh_token: updatedSession.refresh_token,
                  expires_at: updatedSession.expires_at ?? 0,
                }
              : null,
          }));
        }
        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, permissions: [], approvalStatus: null, rejectionReason: null });
        }
      });
    } catch {
      set({ isLoading: false, user: null, session: null, permissions: [], approvalStatus: null });
    }
  },

  refreshIfNeeded: async () => {
    const { session } = get();
    if (!session) return;
    const secondsUntilExpiry = session.expires_at - Date.now() / 1000;
    if (secondsUntilExpiry < TOKEN_REFRESH_BUFFER_SECONDS) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                access_token: data.session!.access_token,
                refresh_token: data.session!.refresh_token,
                expires_at: data.session!.expires_at ?? 0,
              }
            : null,
        }));
      }
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        let msg: string;
        if (error.status === 429) {
          msg = 'auth.errors.rateLimitExceeded';
        } else if (
          error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('email_not_confirmed')
        ) {
          msg = 'auth.errors.emailNotConfirmed';
        } else {
          msg = 'auth.errors.invalidCredentials';
        }
        set({ isLoading: false, error: msg });
        throw error;
      }

      const activeSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? 0,
        user: { id: data.user.id, email: data.user.email ?? '' },
      };

      let profile: Awaited<ReturnType<typeof fetchProfile>>;
      try {
        profile = await fetchProfile(data.user.id);
      } catch {
        // Auth succeeded but profile is missing — treat as pending so the user
        // sees the pending-approval screen instead of a confusing error.
        set({
          session: activeSession,
          user: null,
          permissions: [],
          approvalStatus: 'pending',
          rejectionReason: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      const approvalStatus = profile.approval_status ?? 'pending';
      const rejectionReason = profile.rejection_reason ?? null;
      const permissions = approvalStatus === 'approved'
        ? await fetchPermissions(data.user.id, profile.tenant_id)
        : [];

      set({
        session: activeSession,
        user: profile as unknown as Profile,
        permissions,
        approvalStatus,
        rejectionReason,
        isLoading: false,
        error: null,
      });

      // Register push token after successful login (fire-and-forget)
      registerPushToken(data.user.id).catch(() => {});
    } catch (err: unknown) {
      if (!get().error) set({ isLoading: false, error: 'auth.errors.generic' });
      throw err;
    }
  },

  signOut: async () => {
    const userId = get().session?.user.id;
    if (userId) unregisterPushToken(userId).catch(() => {});
    await supabase.auth.signOut();
    set({ user: null, session: null, permissions: [], approvalStatus: null, rejectionReason: null, error: null, isLoading: false });
  },

  hasPermission: (code) => get().permissions.includes(code),
  clearError: () => set({ error: null }),
}));
