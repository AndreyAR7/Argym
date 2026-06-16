CREATE TABLE IF NOT EXISTS device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'android', -- 'ios' | 'android'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users manage their own tokens from the app
CREATE POLICY "users_own_tokens" ON device_tokens
  FOR ALL USING (user_id = auth.uid());
