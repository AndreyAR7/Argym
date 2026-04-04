import { supabase } from './supabase';
import { AppErrorCode } from './types';
import type { Profile, PrimaryRole } from './types';

export interface SignInResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: { id: string; email: string };
  };
  profile: Profile;
  permissions: string[];
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) {
      throw { code: AppErrorCode.RATE_LIMIT_EXCEEDED, message: error.message };
    }
    throw { code: AppErrorCode.INVALID_CREDENTIALS, message: error.message };
  }

  if (!data.session || !data.user) {
    throw { code: AppErrorCode.UNKNOWN, message: 'No se recibió sesión' };
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
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw { code: AppErrorCode.NOT_FOUND, message: 'Perfil no encontrado' };
  }

  // Load primary role
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  const primaryRole = (userRoleData as any)?.roles?.name as PrimaryRole | undefined;

  return { ...data, primaryRole } as Profile;
}

export async function loadPermissions(userId: string, tenantId: string): Promise<string[]> {
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

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw { code: AppErrorCode.UNKNOWN, message: error.message };
}
