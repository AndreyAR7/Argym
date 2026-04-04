import type { Profile, PrimaryRole } from '@platform/types';
import { AppErrorCode } from '@platform/types';
import { supabase } from './supabase';

export interface AuthServiceSignInResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: { id: string; email: string };
  };
  profile: Profile;
  permissions: string[];
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthServiceSignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) {
      throw { code: AppErrorCode.RATE_LIMIT_EXCEEDED, message: error.message };
    }
    throw { code: AppErrorCode.INVALID_CREDENTIALS, message: error.message };
  }

  if (!data.session || !data.user) {
    throw { code: AppErrorCode.UNKNOWN, message: 'No session returned' };
  }

  const profile = await loadProfile(data.user.id);
  const permissions = await loadPermissions(data.user.id, profile.tenant_id);

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at ?? 0,
      user: { id: data.user.id, email: data.user.email ?? '' },
    },
    profile,
    permissions,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw { code: AppErrorCode.UNKNOWN, message: error.message };
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw { code: AppErrorCode.UNKNOWN, message: error.message };
  }
  return data.session;
}

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { code: AppErrorCode.NOT_FOUND, message: 'Profile not found' };
  }

  // Load primary role
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  let primaryRole: PrimaryRole | undefined;
  if (userRoles && (userRoles as any).roles?.name) {
    primaryRole = (userRoles as any).roles.name as PrimaryRole;
  }

  return { ...data, primaryRole } as Profile;
}

export async function loadPermissions(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role_id, roles(role_permissions(permissions(code)))')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return [];
  }

  const codes: string[] = [];
  for (const ur of data as any[]) {
    const rps = ur.roles?.role_permissions ?? [];
    for (const rp of rps) {
      const code = rp.permissions?.code;
      if (code && !codes.includes(code)) {
        codes.push(code);
      }
    }
  }

  return codes;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw { code: AppErrorCode.UNKNOWN, message: error.message };
  }
}
