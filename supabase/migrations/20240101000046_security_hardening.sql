-- ============================================================
-- Migration 000046: Security hardening — resolves Supabase linter WARNs
--
-- Fixes:
--   0011 function_search_path_mutable   → SET search_path = public on all functions
--   0025 public_bucket_allows_listing   → restrict storage SELECT to authenticated
--   0028 anon_security_definer_*        → REVOKE EXECUTE FROM anon on all SECURITY DEFINER RPCs
--   (0029 authenticated_security_definer for trigger-only functions)
--
-- NOTE: auth_leaked_password_protection must be enabled manually in
--       Supabase Dashboard → Authentication → Password Strength.
-- ============================================================

-- ── 1. SET search_path = public on every function ────────────────────────
-- Prevents search_path injection attacks where a malicious schema
-- placed earlier in the path shadows standard functions.

ALTER FUNCTION public.get_tenant_id()                                                SET search_path = public;
ALTER FUNCTION public.my_tenant_id()                                                 SET search_path = public;
ALTER FUNCTION public.has_permission(permission_code text)                           SET search_path = public;
ALTER FUNCTION public.can_manage_users()                                             SET search_path = public;
ALTER FUNCTION public.is_staff_in_tenant(p_tenant_id uuid)                          SET search_path = public;

ALTER FUNCTION public.handle_new_user()                                              SET search_path = public;
ALTER FUNCTION public.set_updated_at()                                               SET search_path = public;
ALTER FUNCTION public.update_updated_at()                                            SET search_path = public;
ALTER FUNCTION public.protect_approval_fields()                                      SET search_path = public;
ALTER FUNCTION public.set_default_client_level()                                     SET search_path = public;
ALTER FUNCTION public.rls_auto_enable()                                              SET search_path = public;

ALTER FUNCTION public.approve_user(p_user_id uuid, p_role_name text, p_admin_id uuid) SET search_path = public;
ALTER FUNCTION public.reject_user(p_user_id uuid, p_reason text, p_admin_id uuid)    SET search_path = public;
ALTER FUNCTION public.get_users_by_approval_status(p_status text)                   SET search_path = public;
ALTER FUNCTION public.get_approval_status_counts()                                   SET search_path = public;
ALTER FUNCTION public.get_approved_client_count()                                    SET search_path = public;
ALTER FUNCTION public.get_profiles_by_role(role_name text)                           SET search_path = public;
ALTER FUNCTION public.get_clients_with_plan()                                        SET search_path = public;

ALTER FUNCTION public.publish_video(p_video_id uuid, p_user_id uuid)                SET search_path = public;
ALTER FUNCTION public.archive_video(p_video_id uuid, p_user_id uuid)                SET search_path = public;
ALTER FUNCTION public.increment_video_views(p_video_id uuid)                        SET search_path = public;
ALTER FUNCTION public.record_video_view(p_video_id uuid, p_client_id uuid, p_tenant_id uuid, p_session_secs integer) SET search_path = public;

ALTER FUNCTION public.create_notifications_for_users(p_tenant_id uuid, p_rows jsonb) SET search_path = public;

ALTER FUNCTION public.set_client_level(p_client_id uuid, p_client_level text)       SET search_path = public;

ALTER FUNCTION public.next_invoice_number()                                          SET search_path = public;
ALTER FUNCTION public.subscription_end_date(p_start timestamptz, p_cycle text)      SET search_path = public;
ALTER FUNCTION public.assign_plan(p_user_id uuid, p_tenant_id uuid, p_plan_id uuid, p_price numeric) SET search_path = public;
ALTER FUNCTION public.cancel_subscription(p_subscription_id uuid, p_reason text)    SET search_path = public;
ALTER FUNCTION public.mark_invoice_paid(p_invoice_id uuid, p_notes text)            SET search_path = public;
ALTER FUNCTION public.expire_due_subscriptions()                                     SET search_path = public;
ALTER FUNCTION public.expire_subscriptions_for_expired_plans()                       SET search_path = public;
ALTER FUNCTION public.get_billing_summary(p_tenant_id uuid)                         SET search_path = public;

ALTER FUNCTION public.update_profile_by_staff(p_target_user_id uuid, p_full_name text, p_phone text, p_date_of_birth text, p_client_level text, p_is_active boolean) SET search_path = public;
ALTER FUNCTION public.update_profile_by_staff(p_target_user_id uuid, p_full_name text, p_phone text, p_date_of_birth text, p_client_level text, p_clear_client_level boolean, p_is_active boolean) SET search_path = public;


-- ── 2. REVOKE EXECUTE FROM anon on all SECURITY DEFINER functions ─────────
-- None of these functions should be callable without authentication.
-- The /rest/v1/rpc endpoint accepts anon calls by default; revoking
-- EXECUTE closes that surface.

REVOKE EXECUTE ON FUNCTION public.get_tenant_id()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_tenant_id()                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text)           FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_users()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_in_tenant(uuid)       FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_approval_fields()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_default_client_level()     FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()              FROM anon;

REVOKE EXECUTE ON FUNCTION public.approve_user(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_user(uuid, text, uuid)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_users_by_approval_status(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_approval_status_counts()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_approved_client_count()    FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profiles_by_role(text)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_clients_with_plan()        FROM anon;

REVOKE EXECUTE ON FUNCTION public.publish_video(uuid, uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_video(uuid, uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_video_views(uuid)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_video_view(uuid, uuid, uuid, integer) FROM anon;

REVOKE EXECUTE ON FUNCTION public.create_notifications_for_users(uuid, jsonb) FROM anon;

REVOKE EXECUTE ON FUNCTION public.set_client_level(uuid, text)   FROM anon;

REVOKE EXECUTE ON FUNCTION public.assign_plan(uuid, uuid, uuid, numeric)  FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_subscription(uuid, text)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_invoice_paid(uuid, text)           FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_due_subscriptions()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions_for_expired_plans() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_billing_summary(uuid)               FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_profile_by_staff(uuid, text, text, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_profile_by_staff(uuid, text, text, text, text, boolean, boolean) FROM anon;


-- ── 3. REVOKE internal-only functions from authenticated too ──────────────
-- Trigger functions and dev utilities are never valid REST RPC targets.
-- Other SECURITY DEFINER RPCs (approve_user, etc.) are intentionally
-- callable by authenticated users — their bodies enforce role checks.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_approval_fields() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_default_client_level() FROM authenticated;


-- ── 4. Restrict storage SELECT policies to authenticated only ─────────────
-- Public buckets allow URL-based reads without RLS.  The broad SELECT
-- policies on storage.objects were additionally allowing API listing of
-- ALL filenames by any caller, including anonymous users.
-- Restricting to `TO authenticated` closes anon listing without
-- affecting how the app accesses files (it uses getPublicUrl, not list).

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
