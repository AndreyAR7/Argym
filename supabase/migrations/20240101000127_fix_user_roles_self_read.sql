-- user_roles_tenant_isolation only allowed reading a row when its
-- tenant_id matched get_tenant_id() (current profile.tenant_id). Once a
-- platform admin switches their active tenant (switch_platform_admin_tenant),
-- their OWN user_roles row (tied to their home tenant) no longer matches,
-- so every query resolving "what is my role" (session.ts, root page,
-- admin/coach/client layouts — none of these filter by tenant, they just
-- grab the caller's own role) silently returned zero rows. RLS/PostgREST
-- errors on that were swallowed (only `data` destructured), so the app
-- fell through to its "no role assigned" fallback: /pending-approval.
--
-- A user should always be able to read their own role row regardless of
-- which tenant their profile currently points to — add that as an
-- explicit OR, on top of (not replacing) the existing tenant-scoped
-- visibility used by admins listing other members' roles.

DROP POLICY IF EXISTS "user_roles_tenant_isolation" ON public.user_roles;
CREATE POLICY "user_roles_tenant_isolation" ON public.user_roles
  FOR SELECT USING (tenant_id = public.get_tenant_id() OR user_id = auth.uid());
