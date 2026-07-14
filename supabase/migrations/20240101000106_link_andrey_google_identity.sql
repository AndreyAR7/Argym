-- Link Andrey's Google identity (andyrt962@gmail.com) to his existing admin user.
-- His admin account was created with arojas@ologistics.com (email/password),
-- then the email was updated to andyrt962@gmail.com via the Admin API.
-- This migration inserts the Google OAuth identity so future Google sign-ins
-- match the existing admin profile instead of creating a new user.

DO $$
DECLARE
  v_user_id  UUID := '47257faa-8ede-4557-9ef3-5a1faee28f36';
  v_sub      TEXT := '106425661049072625038';
BEGIN
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_sub,
    v_user_id,
    jsonb_build_object(
      'sub',            v_sub,
      'email',          'andyrt962@gmail.com',
      'email_verified', true,
      'provider_id',    v_sub,
      'name',           'Andrey Rojas Torres'
    ),
    'google',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id       = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at    = NOW();
END $$;
