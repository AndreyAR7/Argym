-- ============================================================
-- Plans, Promotions & Subscriptions
-- ============================================================

-- Enums
CREATE TYPE billing_cycle_type AS ENUM ('monthly', 'yearly', 'one_time');
CREATE TYPE promotion_type AS ENUM ('discount', 'announcement', 'bundle');
CREATE TYPE promotion_target_type AS ENUM ('all_users', 'specific_users', 'plan_users');
CREATE TYPE subscription_status_type AS ENUM ('active', 'cancelled', 'expired', 'pending');

-- ============================================================
-- plans
-- ============================================================
CREATE TABLE public.plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'CRC',
  billing_cycle billing_cycle_type NOT NULL DEFAULT 'monthly',
  features     JSONB NOT NULL DEFAULT '[]',
  -- [{ "name": "Clientes ilimitados", "value": "true" }, ...]
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- promotions
-- ============================================================
CREATE TABLE public.promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  type                promotion_type NOT NULL DEFAULT 'announcement',
  discount_percentage NUMERIC(5,2),   -- e.g. 20.00 = 20%
  discount_amount     NUMERIC(10,2),  -- fixed amount off
  applies_to_plan_id  UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  start_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date            TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- promotion_targets
-- ============================================================
CREATE TABLE public.promotion_targets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id   UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  target_type    promotion_target_type NOT NULL DEFAULT 'all_users',
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id        UUID REFERENCES public.plans(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- user_subscriptions
-- ============================================================
CREATE TABLE public.user_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES public.plans(id),
  promotion_id      UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  status            subscription_status_type NOT NULL DEFAULT 'pending',
  start_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date          TIMESTAMPTZ,
  payment_reference TEXT,
  final_price       NUMERIC(10,2),  -- price after discount
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_plans_tenant ON public.plans(tenant_id) WHERE is_active = TRUE;
CREATE INDEX idx_promotions_tenant ON public.promotions(tenant_id);
CREATE INDEX idx_promotions_active ON public.promotions(tenant_id, is_active, start_date, end_date);
CREATE INDEX idx_promotion_targets_promo ON public.promotion_targets(promotion_id);
CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_tenant ON public.user_subscriptions(tenant_id);

-- ============================================================
-- RLS
-- ============================================================

-- plans: everyone in tenant can read active plans; only admin can write
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_tenant_read" ON public.plans
  FOR SELECT USING (tenant_id = public.get_tenant_id() AND is_active = TRUE);

CREATE POLICY "plans_admin_all" ON public.plans
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('billing.manage')
  );

-- promotions: everyone in tenant can read active; only admin can write
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_tenant_read" ON public.promotions
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "promotions_admin_write" ON public.promotions
  FOR ALL USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('billing.manage')
  );

-- promotion_targets
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotion_targets_tenant_read" ON public.promotion_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.promotions p
      WHERE p.id = promotion_targets.promotion_id
        AND p.tenant_id = public.get_tenant_id()
    )
  );

CREATE POLICY "promotion_targets_admin_write" ON public.promotion_targets
  FOR ALL USING (public.has_permission('billing.manage'));

-- user_subscriptions: user sees own; admin sees all in tenant
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own" ON public.user_subscriptions
  FOR SELECT USING (
    tenant_id = public.get_tenant_id()
    AND (user_id = auth.uid() OR public.has_permission('billing.manage'))
  );

CREATE POLICY "subscriptions_insert" ON public.user_subscriptions
  FOR INSERT WITH CHECK (
    tenant_id = public.get_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY "subscriptions_admin_update" ON public.user_subscriptions
  FOR UPDATE USING (
    tenant_id = public.get_tenant_id()
    AND public.has_permission('billing.manage')
  );

-- ============================================================
-- Enable Realtime for promotions (admin broadcasts to clients)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
