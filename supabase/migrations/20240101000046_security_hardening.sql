-- ============================================================
-- Migration 000046: Security hardening — resilient version
-- Uses exception handling to skip functions that don't exist
-- ============================================================

DO $$
BEGIN
  -- SET search_path on existing functions (skip if not found)
  BEGIN ALTER FUNCTION public.get_tenant_id() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.my_tenant_id() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.has_permission(permission_code text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.can_manage_users() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.is_staff_in_tenant(p_tenant_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.handle_new_user() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.set_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_updated_at() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.protect_approval_fields() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.set_default_client_level() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.rls_auto_enable() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.approve_user(p_user_id uuid, p_role_name text, p_admin_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.reject_user(p_user_id uuid, p_reason text, p_admin_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_users_by_approval_status(p_status text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_approval_status_counts() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_approved_client_count() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_profiles_by_role(role_name text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_clients_with_plan() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.publish_video(p_video_id uuid, p_user_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.archive_video(p_video_id uuid, p_user_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.increment_video_views(p_video_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.record_video_view(p_video_id uuid, p_client_id uuid, p_tenant_id uuid, p_session_secs integer) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.create_notifications_for_users(p_tenant_id uuid, p_rows jsonb) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.set_client_level(p_client_id uuid, p_client_level text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.next_invoice_number() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.subscription_end_date(p_start timestamptz, p_cycle text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.assign_plan(p_user_id uuid, p_tenant_id uuid, p_plan_id uuid, p_price numeric) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.cancel_subscription(p_subscription_id uuid, p_reason text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.mark_invoice_paid(p_invoice_id uuid, p_notes text) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.expire_due_subscriptions() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.expire_subscriptions_for_expired_plans() SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.get_billing_summary(p_tenant_id uuid) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_profile_by_staff(p_target_user_id uuid, p_full_name text, p_phone text, p_date_of_birth text, p_client_level text, p_is_active boolean) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN ALTER FUNCTION public.update_profile_by_staff(p_target_user_id uuid, p_full_name text, p_phone text, p_date_of_birth text, p_client_level text, p_clear_client_level boolean, p_is_active boolean) SET search_path = public; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
END $$;

DO $$
BEGIN
  -- REVOKE EXECUTE FROM anon (skip if function not found)
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_tenant_id() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.my_tenant_id() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.can_manage_users() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.is_staff_in_tenant(uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.protect_approval_fields() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.set_default_client_level() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.reject_user(uuid, text, uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_users_by_approval_status(text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_approval_status_counts() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_approved_client_count() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_profiles_by_role(text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_clients_with_plan() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.publish_video(uuid, uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.archive_video(uuid, uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.increment_video_views(uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.record_video_view(uuid, uuid, uuid, integer) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.create_notifications_for_users(uuid, jsonb) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.set_client_level(uuid, text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.assign_plan(uuid, uuid, uuid, numeric) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.cancel_subscription(uuid, text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.mark_invoice_paid(uuid, text) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.expire_due_subscriptions() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.expire_subscriptions_for_expired_plans() FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.get_billing_summary(uuid) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.update_profile_by_staff(uuid, text, text, text, text, boolean) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.update_profile_by_staff(uuid, text, text, text, text, boolean, boolean) FROM anon; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
END $$;

DO $$
BEGIN
  BEGIN REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.protect_approval_fields() FROM authenticated; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
  BEGIN REVOKE EXECUTE ON FUNCTION public.set_default_client_level() FROM authenticated; EXCEPTION WHEN undefined_function OR undefined_object THEN NULL; END;
END $$;

-- Storage policies (safe to run — DROP IF EXISTS handles missing policies)
DROP POLICY IF EXISTS "avatars_select"               ON storage.objects;
DROP POLICY IF EXISTS "auth can read video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "auth can read videos"          ON storage.objects;

CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "auth can read video thumbnails" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'video-thumbnails');

CREATE POLICY "auth can read videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos');
