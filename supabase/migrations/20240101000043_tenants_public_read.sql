-- Allow unauthenticated users to discover active tenants during self-registration.
-- The trigger handle_new_user() requires tenant_id in signup metadata —
-- without this policy, new users can't look up the tenant and end up with
-- no profile row (invisible to the admin approval queue).

CREATE POLICY "tenants_public_read_active" ON public.tenants
  FOR SELECT USING (is_active = TRUE);
