-- The select-branch page (used after Google OAuth login) is accessed by
-- authenticated users who don't yet have a branch_id set. At that point,
-- get_tenant_id() returns their tenant_id from profiles (since profiles.tenant_id
-- IS set for migrated users). However, branches_auth_read filters by tenant_id
-- which means users in the wrong tenant context or with partial session state
-- might not see branches.
--
-- This policy adds a broader fallback: any authenticated user can see all
-- active branches. This is intentionally permissive for the onboarding flow
-- (branch discovery doesn't leak sensitive data).
--
-- Effective policy precedence: branches_active_read (IS active) ∪ branches_auth_read
-- (tenant-scoped) ∪ branches_anon_read (anon, is_active only).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branches' AND policyname='branches_active_read') THEN
    EXECUTE $p$
      CREATE POLICY "branches_active_read" ON public.branches
        FOR SELECT TO authenticated
        USING (is_active = TRUE)
    $p$;
  END IF;
END $$;
