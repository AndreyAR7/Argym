// ─── Tenant ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'yearly';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  locale: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module: string;
  enabled: boolean;
  created_at: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

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

// ─── Errors ───────────────────────────────────────────────────────────────────

export enum AppErrorCode {
  INVALID_CREDENTIALS = 'AUTH_001',
  SESSION_EXPIRED     = 'AUTH_002',
  RATE_LIMIT_EXCEEDED = 'AUTH_003',
  UNAUTHORIZED        = 'AUTH_004',
  TENANT_NOT_FOUND    = 'TEN_001',
  MODULE_DISABLED     = 'TEN_002',
  VALIDATION_ERROR    = 'VAL_001',
  FILE_TOO_LARGE      = 'VAL_002',
  NETWORK_ERROR       = 'NET_001',
  UNKNOWN             = 'GEN_001',
  NOT_FOUND           = 'GEN_002',
}

export interface AppError {
  code: AppErrorCode;
  message: string;
}
