-- Real platform-superadmin concept, independent of tenant_id/roles.
-- The /super-admin section previously gated access by checking
-- session.role === 'admin' — the same role any tenant's own gym-owner
-- admin has, so any tenant admin could reach it and manage other
-- businesses. This table + function give a genuine, tenant-independent
-- gate for the one real platform owner.

CREATE TABLE public.platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: no client (anon or authenticated) can read/write
-- this table directly. It's only ever consulted via is_platform_admin() below;
-- only service_role/Studio can add or remove platform admins.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Andrey Rojas Torres, CaroGym's admin account (profiles.full_name = 'Andrey Rojas Torres').
INSERT INTO public.platform_admins (user_id)
VALUES ('47257faa-8ede-4557-9ef3-5a1faee28f36')
ON CONFLICT DO NOTHING;
