-- profiles only had profiles_self_update (id = auth.uid()) for UPDATE —
-- there was never a policy letting an admin update ANOTHER user's row.
-- Any admin action editing a client/coach's profile (e.g. deactivate,
-- toggleProfileActiveAction) silently matched zero rows: RLS filtered the
-- row out before the UPDATE ran, so PostgREST returned no error and the
-- client-side code (which never checked the response) saw nothing happen.

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_users'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('tenant.manage_users'));
