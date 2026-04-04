export type UserTheme = 'system' | 'light' | 'dark';
export type PrimaryRole = 'admin' | 'coach' | 'client';

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  locale: string;
  theme: UserTheme;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  primaryRole?: PrimaryRole;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string | null;
  module: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  is_active: boolean;
  created_at: string;
}
