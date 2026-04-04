import type { Profile } from './user';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}

export interface SignInResult {
  session: AuthSession;
  profile: Profile;
  permissions: string[];
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  tenant_id: string;
}

export interface ForgotPasswordInput {
  email: string;
}
