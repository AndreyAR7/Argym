-- ============================================================
-- Client invitations: admin invites a person by email/name, the
-- app emails them a join link. If they sign up (Google OR
-- email/password) using that exact email, handle_new_user() skips
-- the normal pending-approval flow entirely — they become an
-- active client immediately, same as createClientAction's direct
-- "Nuevo cliente" path, but self-served instead of admin-typed.
--
-- Matching is by email only, regardless of signup method, because
-- Google OAuth never carries tenant_id in its metadata (see
-- 20240101000055/20240101000187) — email match is the only signal
-- that ties an OAuth sign-up back to a specific tenant's invite.
-- ============================================================

CREATE TABLE public.client_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  token             UUID NOT NULL DEFAULT gen_random_uuid(),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_user_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')
);

CREATE UNIQUE INDEX idx_client_invitations_token ON public.client_invitations(token);

-- Only one open invite per email per tenant — re-inviting reuses/replaces it
-- from the app layer instead of piling up duplicates.
CREATE UNIQUE INDEX idx_client_invitations_pending_email
  ON public.client_invitations(tenant_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX idx_client_invitations_tenant ON public.client_invitations(tenant_id, created_at DESC);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Same shape as body_measurements'/client_medical_records' staff policy —
-- no tenant-wide read policy, no client-facing policy at all (the public
-- invite-landing page reads through get_invitation_by_token() below instead,
-- since the recipient has no account/session yet).
CREATE POLICY "client_invitations_staff_manage" ON public.client_invitations
  FOR ALL
  USING (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'))
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.has_permission('clients.manage'));

-- ============================================================
-- Public lookup by token — powers the unauthenticated /invite/[token]
-- landing page. Returns only what that page needs to render (never the
-- full row), and only while the invite hasn't expired.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token UUID)
RETURNS TABLE (
  email           TEXT,
  full_name       TEXT,
  status          TEXT,
  tenant_name     TEXT,
  tenant_slug     TEXT,
  tenant_logo_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ci.email, ci.full_name, ci.status, t.name, t.slug, t.logo_url
  FROM public.client_invitations ci
  JOIN public.tenants t ON t.id = ci.tenant_id
  WHERE ci.token = p_token AND ci.expires_at > NOW();
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(UUID) TO anon, authenticated;

-- ============================================================
-- handle_new_user(): auto-approve a signup that matches a pending,
-- unexpired invitation — for ANY signup method (email match is what
-- ties it to the invite, not the auth provider used).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id      UUID;
  v_requested_role TEXT;
  v_full_name      TEXT;
  v_avatar_url     TEXT;
  v_branch_id      UUID;
  v_invitation     RECORD;
  v_is_invited     BOOLEAN := FALSE;
  v_role_id        UUID;
BEGIN
  v_tenant_id  := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_branch_id  := (NEW.raw_user_meta_data->>'branch_id')::UUID;

  SELECT * INTO v_invitation
  FROM public.client_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_tenant_id  := v_invitation.tenant_id;
    v_is_invited := TRUE;
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE is_active = TRUE
    ORDER BY created_at
    LIMIT 1;
  END IF;

  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'client');

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    v_invitation.full_name,
    split_part(NEW.email, '@', 1)
  );

  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, tenant_id, full_name, avatar_url, branch_id,
      locale, theme, is_active, approval_status, requested_role,
      approved_by, approved_at
    ) VALUES (
      NEW.id, v_tenant_id, v_full_name, v_avatar_url, v_branch_id,
      'es-CR', 'dark',
      v_is_invited,
      CASE WHEN v_is_invited THEN 'approved' ELSE 'pending' END,
      v_requested_role,
      CASE WHEN v_is_invited THEN v_invitation.invited_by ELSE NULL END,
      CASE WHEN v_is_invited THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;

    IF v_is_invited THEN
      SELECT id INTO v_role_id FROM public.roles WHERE name = 'client';
      IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, tenant_id, role_id, assigned_by)
        VALUES (NEW.id, v_tenant_id, v_role_id, v_invitation.invited_by)
        ON CONFLICT (user_id, tenant_id, role_id) DO NOTHING;
      END IF;

      UPDATE public.client_invitations
      SET status = 'accepted', accepted_at = NOW(), accepted_user_id = NEW.id
      WHERE id = v_invitation.id;
    END IF;
  ELSE
    RAISE WARNING 'handle_new_user: no active tenant resolved, skipped profile creation for user % (%)', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
