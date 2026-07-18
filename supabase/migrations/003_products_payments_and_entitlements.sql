-- RAPID4GRAD V2 baseline 003
-- Provider-neutral products, one-time orders, payments, and permanent entitlements.

CREATE TYPE public.product_type AS ENUM (
  'course',
  'professor_subscription',
  'consultation',
  'bundle',
  'ai_credits'
);
CREATE TYPE public.billing_model AS ENUM ('one_time', 'recurring', 'manual');
CREATE TYPE public.payment_provider AS ENUM (
  'ecpay',
  'newebpay',
  'tappay',
  'stripe',
  'manual'
);
CREATE TYPE public.price_interval AS ENUM ('one_time', 'month', 'year', 'manual');
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refunded'
);
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);
CREATE TYPE public.payment_event_status AS ENUM ('processing', 'processed', 'failed');
CREATE TYPE public.entitlement_type AS ENUM ('course_full', 'legacy_tool_access');
CREATE TYPE public.entitlement_status AS ENUM ('active', 'revoked');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  product_type public.product_type NOT NULL,
  billing_model public.billing_model NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX products_active_type_idx
  ON public.products(is_active, product_type);

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  provider_price_id TEXT,
  currency TEXT NOT NULL DEFAULT 'TWD' CHECK (char_length(currency) = 3),
  amount INTEGER CHECK (amount IS NULL OR amount >= 0),
  interval public.price_interval NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, provider_price_id)
);

CREATE INDEX product_prices_product_active_idx
  ON public.product_prices(product_id, is_active);

CREATE TRIGGER product_prices_set_updated_at
BEFORE UPDATE ON public.product_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_price_id UUID REFERENCES public.product_prices(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TWD' CHECK (char_length(currency) = 3),
  status public.order_status NOT NULL DEFAULT 'pending',
  provider public.payment_provider NOT NULL,
  provider_order_id TEXT,
  idempotency_key TEXT NOT NULL,
  checkout_url TEXT,
  raw_checkout_payload JSONB,
  confirmation_email_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX orders_provider_order_unique
  ON public.orders(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;
CREATE INDEX orders_user_created_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status);

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  provider public.payment_provider NOT NULL,
  provider_payment_id TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'TWD' CHECK (char_length(currency) = 3),
  status public.payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX payments_provider_payment_unique
  ON public.payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payments_order_idx ON public.payments(order_id);
CREATE INDEX payments_user_created_idx ON public.payments(user_id, created_at DESC);

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  provider public.payment_provider NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  status public.payment_event_status NOT NULL DEFAULT 'processing',
  processing_started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  payload JSONB NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX payment_events_status_idx ON public.payment_events(status, processing_started_at);

CREATE TRIGGER payment_events_set_updated_at
BEFORE UPDATE ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  entitlement_type public.entitlement_type NOT NULL,
  status public.entitlement_status NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ends_at TIMESTAMPTZ,
  source_order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  source_payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT entitlements_permanent_course_no_expiry
    CHECK (entitlement_type <> 'course_full' OR ends_at IS NULL),
  CONSTRAINT entitlements_revocation_consistent
    CHECK (
      (status = 'active' AND revoked_at IS NULL)
      OR (status = 'revoked' AND revoked_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX entitlements_active_user_type_unique
  ON public.entitlements(user_id, entitlement_type)
  WHERE status = 'active';
CREATE UNIQUE INDEX entitlements_source_order_unique
  ON public.entitlements(source_order_id)
  WHERE source_order_id IS NOT NULL;
CREATE INDEX entitlements_user_status_idx
  ON public.entitlements(user_id, status);

CREATE TRIGGER entitlements_set_updated_at
BEFORE UPDATE ON public.entitlements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_access (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL DEFAULT 'course_plus_6mo_tool',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX course_access_user_active_idx
  ON public.course_access(user_id, is_active, expires_at DESC);

COMMENT ON TABLE public.course_access IS
  'Deprecated Phase 1 compatibility table. V2 course access uses entitlements.';

CREATE OR REPLACE FUNCTION public.grant_course_entitlement_for_order(
  target_order_id UUID,
  target_payment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_order public.orders%ROWTYPE;
  selected_product public.products%ROWTYPE;
  entitlement_id UUID;
BEGIN
  SELECT *
  INTO selected_order
  FROM public.orders
  WHERE id = target_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF selected_order.status <> 'paid'::public.order_status THEN
    RAISE EXCEPTION 'order_not_paid';
  END IF;

  SELECT *
  INTO selected_product
  FROM public.products
  WHERE id = selected_order.product_id;

  IF selected_product.metadata ->> 'entitlement_type' <> 'course_full' THEN
    RAISE EXCEPTION 'product_does_not_grant_course_full';
  END IF;

  IF target_payment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.payments AS payment
    WHERE payment.id = target_payment_id
      AND payment.order_id = selected_order.id
      AND payment.status = 'completed'::public.payment_status
  ) THEN
    RAISE EXCEPTION 'completed_payment_not_found';
  END IF;

  INSERT INTO public.entitlements (
    user_id,
    product_id,
    entitlement_type,
    status,
    starts_at,
    ends_at,
    source_order_id,
    source_payment_id
  )
  VALUES (
    selected_order.user_id,
    selected_order.product_id,
    'course_full'::public.entitlement_type,
    'active'::public.entitlement_status,
    COALESCE(selected_order.paid_at, timezone('utc', now())),
    NULL,
    selected_order.id,
    target_payment_id
  )
  ON CONFLICT (user_id, entitlement_type)
    WHERE status = 'active'::public.entitlement_status
  DO UPDATE SET
    product_id = EXCLUDED.product_id,
    ends_at = NULL,
    source_order_id = COALESCE(public.entitlements.source_order_id, EXCLUDED.source_order_id),
    source_payment_id = COALESCE(public.entitlements.source_payment_id, EXCLUDED.source_payment_id),
    updated_at = timezone('utc', now())
  RETURNING id INTO entitlement_id;

  RETURN entitlement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_course_entitlement_for_order(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_course_entitlement_for_order(UUID, UUID)
  TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;
