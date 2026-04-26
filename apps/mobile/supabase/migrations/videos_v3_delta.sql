-- ═══════════════════════════════════════════════════════════════
-- VIDEO MODULE v3 — Delta migration (run after videos_v2.sql)
-- Adds missing fields needed for real plan/level access control
-- ═══════════════════════════════════════════════════════════════

-- 1. Add fitness level to profiles
--    Clients set this during onboarding or admin sets it manually
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_level TEXT
    CHECK (client_level IN ('beginner', 'intermediate', 'advanced'))
    DEFAULT NULL;

-- 2. Add plan_tier to plans table
--    Maps a plan to the video access tier (basic/medium/premium)
--    Admin sets this when creating/editing a plan
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS plan_tier TEXT
    CHECK (plan_tier IN ('basic', 'medium', 'premium'))
    DEFAULT 'basic';

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(client_level);
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(plan_tier);
