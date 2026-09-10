import { create } from 'zustand';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { AppErrorCode } from '@/lib/types';
import { registerPushToken, unregisterPushToken } from '@/lib/pushNotifications';
import { resetAllStores } from '@/lib/resetAllStores';
import type { Profile, PrimaryRole } from '@/lib/types';

WebBrowser.maybeCompleteAuthSession();

let authSubscription: { unsubscribe: () => void } | null = null;

// None of the boot/login network calls below had a timeout, so a single
// stalled request (flaky wifi, captive portal, a dropped connection while
// switching networks) left the app frozen on the loading spinner forever
// with no way to recover short of a force-kill. Race every one of them
// against this so a hang degrades to a normal, catchable error instead.
const NETWORK_TIMEOUT_MS = 15000;

class TimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number = NETWORK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

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
  rejectionCount: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  finishOAuthCallback: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshIfNeeded: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  clearError: () => void;
  resubmitRegistration: () => Promise<{ error?: string }>;
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
  rejection_count: number;
  date_of_birth: string | null;
  gender: string | null;
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
  rejectionCount: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession());
      if (!session) {
        set({ isLoading: false });
        return;
      }

      // Refresh token on boot if it expires soon
      let activeSession = session;
      const expiresAt = session.expires_at ?? 0;
      if (expiresAt - Date.now() / 1000 < TOKEN_REFRESH_BUFFER_SECONDS) {
        const { data: refreshed } = await withTimeout(supabase.auth.refreshSession());
        if (refreshed.session) activeSession = refreshed.session;
      }

      const profile = await withTimeout(fetchProfile(activeSession.user.id));
      const approvalStatus = profile.approval_status ?? 'pending';
      const rejectionReason = profile.rejection_reason ?? null;
      const rejectionCount = profile.rejection_count ?? 0;
      const permissions = approvalStatus === 'approved'
        ? await withTimeout(fetchPermissions(activeSession.user.id, profile.tenant_id))
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
        rejectionCount,
        isLoading: false,
      });

      // Keep session in sync with Supabase auth state changes (token refresh, sign-out)
      authSubscription?.unsubscribe();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, updatedSession) => {
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
          resetAllStores();
          set({ user: null, session: null, permissions: [], approvalStatus: null, rejectionReason: null });
        }
      });
      authSubscription = subscription;
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
        const refreshedSession = data.session;
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                access_token: refreshedSession.access_token,
                refresh_token: refreshedSession.refresh_token,
                expires_at: refreshedSession.expires_at ?? 0,
              }
            : null,
        }));
      }
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
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
        profile = await withTimeout(fetchProfile(data.user.id));
      } catch (profileErr) {
        if (profileErr instanceof TimeoutError) {
          // Auth already succeeded (we have a session) — don't strand the
          // user on a frozen spinner just because the profile fetch stalled.
          set({ isLoading: false, error: 'auth.errors.networkTimeout' });
          return;
        }
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
      const rejectionCount = profile.rejection_count ?? 0;
      const permissions = approvalStatus === 'approved'
        ? await withTimeout(fetchPermissions(data.user.id, profile.tenant_id))
        : [];

      set({
        session: activeSession,
        user: profile as unknown as Profile,
        permissions,
        approvalStatus,
        rejectionReason,
        rejectionCount,
        isLoading: false,
        error: null,
      });

      // Register push token after successful login (fire-and-forget)
      registerPushToken(data.user.id).catch(() => {});
    } catch (err: unknown) {
      if (!get().error) {
        const msg = err instanceof TimeoutError ? 'auth.errors.networkTimeout' : 'auth.errors.generic';
        set({ isLoading: false, error: msg });
      }
      throw err;
    }
  },

  signOut: async () => {
    const userId = get().session?.user.id;
    if (userId) {
      try {
        await unregisterPushToken(userId);
      } catch {
        // Network failure should not block sign out
      }
    }
    await supabase.auth.signOut();
    resetAllStores();
    set({ user: null, session: null, permissions: [], approvalStatus: null, rejectionReason: null, error: null, isLoading: false });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      // Construct the redirect URI using the app's deep-link scheme
      // (app.config.js → expo.scheme: "argym").
      const redirectUri = Linking.createURL('auth/callback');

      const { data, error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: true },
      }));

      if (error || !data.url) {
        set({ isLoading: false, error: 'auth.errors.generic' });
        return;
      }

      // Open in-app browser; it closes automatically once redirected back to
      // redirectUri. We deliberately don't parse `result.url` here — on this
      // app expo-router's own deep-link handling races this same event and
      // routinely wins, mounting app/auth/callback.tsx (which does the
      // actual code exchange via finishOAuthCallback) before this promise
      // settles. If the browser is simply dismissed with nothing else
      // in flight, clear the spinner; otherwise leave isLoading as-is so we
      // don't flash the login form while the callback screen takes over.
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (result.type !== 'success') {
        set({ isLoading: false });
      }
    } catch (err) {
      const msg = err instanceof TimeoutError ? 'auth.errors.networkTimeout' : 'auth.errors.generic';
      set({ isLoading: false, error: msg });
    }
  },

  finishOAuthCallback: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: sessionData, error: sessionError } = await withTimeout(supabase.auth.exchangeCodeForSession(code));
      if (sessionError || !sessionData.session) {
        set({ isLoading: false, error: 'auth.errors.generic' });
        return;
      }

      const sess = sessionData.session;
      let profile: Awaited<ReturnType<typeof fetchProfile>>;
      try {
        profile = await withTimeout(fetchProfile(sess.user.id));
      } catch (profileErr) {
        if (profileErr instanceof TimeoutError) {
          set({ isLoading: false, error: 'auth.errors.networkTimeout' });
          return;
        }
        set({
          session: { access_token: sess.access_token, refresh_token: sess.refresh_token, expires_at: sess.expires_at ?? 0, user: { id: sess.user.id, email: sess.user.email ?? '' } },
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
      const permissions    = approvalStatus === 'approved'
        ? await withTimeout(fetchPermissions(sess.user.id, profile.tenant_id))
        : [];

      set({
        session: { access_token: sess.access_token, refresh_token: sess.refresh_token, expires_at: sess.expires_at ?? 0, user: { id: sess.user.id, email: sess.user.email ?? '' } },
        user: profile as unknown as Profile,
        permissions,
        approvalStatus,
        rejectionReason: profile.rejection_reason ?? null,
        rejectionCount: profile.rejection_count ?? 0,
        isLoading: false,
        error: null,
      });

      registerPushToken(sess.user.id).catch(() => {});
    } catch (err) {
      const msg = err instanceof TimeoutError ? 'auth.errors.networkTimeout' : 'auth.errors.generic';
      set({ isLoading: false, error: msg });
    }
  },

  hasPermission: (code) => get().permissions.includes(code),
  clearError: () => set({ error: null }),

  resubmitRegistration: async () => {
    const userId = get().session?.user.id;
    if (!userId) return { error: 'No autenticado' };

    const { error } = await supabase.rpc('resubmit_registration', { p_user_id: userId });
    if (error) return { error: error.message };

    set({ approvalStatus: 'pending', rejectionReason: null });
    return {};
  },
}));
