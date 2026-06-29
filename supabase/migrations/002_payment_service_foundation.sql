-- ============================================================
-- RAPID4GRAD Phase 1 — Payment Service Foundation
-- Migration: 002_payment_service_foundation.sql
-- Scope: provider-neutral payment tables and compatibility fields.
-- ============================================================

-- ============================================================
-- 1. products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'twd',
  duration_months SMALLINT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

INSERT INTO public.products
  (slug, name, description, amount, currency, duration_months, is_active)
VALUES
  (
    'rapid4grad-course',
    '研究生畢業加速課程 + 6 個月研究報告 AI 指令產生器',
    'RAPID4GRAD Phase 1 main course bundle.',
    2400,
    'twd',
    6,
    TRUE
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount = EXCLUDED.amount,
  currency = EXCLUDED.currency,
  duration_months = EXCLUDED.duration_months,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 2. orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES public.products(id),
  amount               INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'twd',
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
                         'pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded'
                       )),
  provider             TEXT NOT NULL
                       CHECK (provider IN ('ecpay', 'newebpay', 'tappay', 'stripe')),
  provider_order_id    TEXT UNIQUE,
  checkout_url         TEXT,
  raw_checkout_payload JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON public.orders(provider_order_id);

-- ============================================================
-- 3. payments provider-neutral additions
-- Keep all Stripe legacy columns. Do not drop or rename anything in Phase 1.
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_provider_check'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_provider_check
      CHECK (
        provider IS NULL
        OR provider IN ('ecpay', 'newebpay', 'tappay', 'stripe')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON public.payments(provider, provider_payment_id);

-- ============================================================
-- 4. entitlements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entitlements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id),
  type              TEXT NOT NULL
                    CHECK (type IN ('course_access', 'tool_access', 'membership')),
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'revoked')),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at           TIMESTAMPTZ,
  source_order_id   UUID REFERENCES public.orders(id),
  source_payment_id UUID REFERENCES public.payments(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_entitlements_updated_at
  BEFORE UPDATE ON public.entitlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_product_id ON public.entitlements(product_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON public.entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_ends_at ON public.entitlements(ends_at);

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products: public can read active"
  ON public.products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "products: admin can manage all"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "orders: user can view own"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders: admin can view all"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "entitlements: user can view own"
  ON public.entitlements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "entitlements: admin can view all"
  ON public.entitlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
