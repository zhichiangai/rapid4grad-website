-- RAPID4GRAD V2 Task 3
-- Provider-neutral student course checkout and transactional payment finalization.

CREATE UNIQUE INDEX product_prices_one_active_provider_interval_unique
  ON public.product_prices(product_id, provider, interval)
  WHERE is_active;

CREATE OR REPLACE FUNCTION public.create_student_course_checkout_order(
  target_user_id UUID,
  target_provider public.payment_provider,
  target_idempotency_key TEXT
)
RETURNS TABLE (
  order_id UUID,
  user_id UUID,
  product_id UUID,
  product_price_id UUID,
  product_slug TEXT,
  product_name TEXT,
  product_type public.product_type,
  product_metadata JSONB,
  amount INTEGER,
  currency TEXT,
  provider public.payment_provider,
  provider_order_id TEXT,
  order_status public.order_status,
  checkout_url TEXT,
  is_lab_discount BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_order public.orders%ROWTYPE;
  selected_product public.products%ROWTYPE;
  selected_price public.product_prices%ROWTYPE;
  eligible_for_lab_discount BOOLEAN := FALSE;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF target_provider NOT IN (
    'ecpay'::public.payment_provider,
    'newebpay'::public.payment_provider,
    'tappay'::public.payment_provider,
    'stripe'::public.payment_provider,
    'manual'::public.payment_provider
  ) THEN
    RAISE EXCEPTION 'unsupported_payment_provider';
  END IF;

  IF target_idempotency_key IS NULL
     OR char_length(target_idempotency_key) < 16
     OR char_length(target_idempotency_key) > 128 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;

  -- Serialize checkout creation per user so double-clicks and parallel tabs cannot
  -- create multiple open course orders.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_user_id::TEXT, 438721)
  );

  IF EXISTS (
    SELECT 1
    FROM public.entitlements AS entitlement
    WHERE entitlement.user_id = target_user_id
      AND entitlement.entitlement_type = 'course_full'::public.entitlement_type
      AND entitlement.status = 'active'::public.entitlement_status
      AND entitlement.ends_at IS NULL
  ) THEN
    RAISE EXCEPTION 'course_already_owned';
  END IF;

  SELECT existing_order.*
  INTO selected_order
  FROM public.orders AS existing_order
  WHERE existing_order.user_id = target_user_id
    AND existing_order.idempotency_key = target_idempotency_key;

  IF NOT FOUND THEN
    UPDATE public.orders AS stale_order
    SET status = 'expired'::public.order_status
    FROM public.products AS stale_product
    WHERE stale_order.product_id = stale_product.id
      AND stale_order.user_id = target_user_id
      AND stale_order.status IN (
        'pending'::public.order_status,
        'processing'::public.order_status
      )
      AND stale_order.created_at < timezone('utc', now()) - INTERVAL '30 minutes'
      AND stale_product.metadata ->> 'entitlement_type' = 'course_full';

    SELECT existing_order.*
    INTO selected_order
    FROM public.orders AS existing_order
    JOIN public.products AS existing_product
      ON existing_product.id = existing_order.product_id
    WHERE existing_order.user_id = target_user_id
      AND existing_order.provider = target_provider
      AND existing_order.status IN (
        'pending'::public.order_status,
        'processing'::public.order_status
      )
      AND existing_product.metadata ->> 'entitlement_type' = 'course_full'
    ORDER BY existing_order.created_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.lab_memberships AS membership
      JOIN public.subscriptions AS subscription
        ON subscription.lab_id = membership.lab_id
      WHERE membership.user_id = target_user_id
        AND membership.role = 'student'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
        AND subscription.status IN (
          'active'::public.subscription_status,
          'trialing'::public.subscription_status
        )
        AND subscription.current_period_start <= timezone('utc', now())
        AND subscription.current_period_end > timezone('utc', now())
    ) INTO eligible_for_lab_discount;

    IF eligible_for_lab_discount THEN
      SELECT product.*
      INTO selected_product
      FROM public.products AS product
      JOIN public.product_prices AS price ON price.product_id = product.id
      WHERE product.slug = 'student-lab-course-upgrade'
        AND product.is_active
        AND product.billing_model = 'one_time'::public.billing_model
        AND product.metadata ->> 'entitlement_type' = 'course_full'
        AND price.provider = target_provider
        AND price.interval = 'one_time'::public.price_interval
        AND price.is_active
        AND price.amount IS NOT NULL
      LIMIT 1;

      IF selected_product.id IS NOT NULL THEN
        SELECT price.* INTO selected_price
        FROM public.product_prices AS price
        WHERE price.product_id = selected_product.id
          AND price.provider = target_provider
          AND price.interval = 'one_time'::public.price_interval
          AND price.is_active
          AND price.amount IS NOT NULL
        LIMIT 1;
      END IF;
    END IF;

    IF selected_product.id IS NULL THEN
      eligible_for_lab_discount := FALSE;

      SELECT product.*
      INTO selected_product
      FROM public.products AS product
      JOIN public.product_prices AS price ON price.product_id = product.id
      WHERE product.slug = 'student-course-full'
        AND product.is_active
        AND product.billing_model = 'one_time'::public.billing_model
        AND product.metadata ->> 'entitlement_type' = 'course_full'
        AND price.provider = target_provider
        AND price.interval = 'one_time'::public.price_interval
        AND price.is_active
        AND price.amount IS NOT NULL
      LIMIT 1;

      IF selected_product.id IS NOT NULL THEN
        SELECT price.* INTO selected_price
        FROM public.product_prices AS price
        WHERE price.product_id = selected_product.id
          AND price.provider = target_provider
          AND price.interval = 'one_time'::public.price_interval
          AND price.is_active
          AND price.amount IS NOT NULL
        LIMIT 1;
      END IF;
    END IF;

    IF selected_product.id IS NULL OR selected_price.id IS NULL THEN
      RAISE EXCEPTION 'course_price_not_available';
    END IF;

    INSERT INTO public.orders (
      user_id,
      product_id,
      product_price_id,
      amount,
      currency,
      status,
      provider,
      idempotency_key
    )
    VALUES (
      target_user_id,
      selected_product.id,
      selected_price.id,
      selected_price.amount,
      selected_price.currency,
      'pending'::public.order_status,
      target_provider,
      target_idempotency_key
    )
    RETURNING * INTO selected_order;
  ELSE
    SELECT * INTO selected_product
    FROM public.products WHERE id = selected_order.product_id;

    SELECT * INTO selected_price
    FROM public.product_prices WHERE id = selected_order.product_price_id;

    eligible_for_lab_discount := selected_product.slug = 'student-lab-course-upgrade';
  END IF;

  RETURN QUERY SELECT
    selected_order.id,
    selected_order.user_id,
    selected_order.product_id,
    selected_order.product_price_id,
    selected_product.slug,
    selected_product.name,
    selected_product.product_type,
    selected_product.metadata,
    selected_order.amount,
    selected_order.currency,
    selected_order.provider,
    selected_order.provider_order_id,
    selected_order.status,
    selected_order.checkout_url,
    eligible_for_lab_discount;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_course_checkout_order(
  UUID,
  public.payment_provider,
  TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_course_checkout_order(
  UUID,
  public.payment_provider,
  TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.process_one_time_payment_event(
  target_provider public.payment_provider,
  target_event_id TEXT,
  target_event_type TEXT,
  target_provider_order_id TEXT,
  target_provider_payment_id TEXT,
  target_outcome TEXT,
  target_amount INTEGER,
  target_currency TEXT,
  target_paid_at TIMESTAMPTZ,
  target_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_order public.orders%ROWTYPE;
  selected_payment public.payments%ROWTYPE;
  selected_event public.payment_events%ROWTYPE;
  entitlement_id UUID;
BEGIN
  IF target_event_id IS NULL OR char_length(target_event_id) NOT BETWEEN 8 AND 255 THEN
    RAISE EXCEPTION 'invalid_payment_event_id';
  END IF;

  IF target_event_type IS NULL OR char_length(target_event_type) NOT BETWEEN 3 AND 120 THEN
    RAISE EXCEPTION 'invalid_payment_event_type';
  END IF;

  IF target_provider_order_id IS NULL
     OR char_length(target_provider_order_id) NOT BETWEEN 8 AND 255 THEN
    RAISE EXCEPTION 'invalid_provider_order_id';
  END IF;

  IF target_provider_payment_id IS NULL
     OR char_length(target_provider_payment_id) NOT BETWEEN 8 AND 255 THEN
    RAISE EXCEPTION 'invalid_provider_payment_id';
  END IF;

  IF target_outcome NOT IN ('completed', 'failed', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'invalid_payment_outcome';
  END IF;

  IF target_amount IS NULL OR target_amount < 0
     OR target_currency IS NULL OR char_length(target_currency) <> 3 THEN
    RAISE EXCEPTION 'invalid_payment_amount';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_provider::TEXT || ':' || target_provider_order_id,
      731904
    )
  );

  SELECT * INTO selected_order
  FROM public.orders
  WHERE provider = target_provider
    AND provider_order_id = target_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_order_not_found';
  END IF;

  IF selected_order.amount <> target_amount
     OR upper(selected_order.currency) <> upper(target_currency) THEN
    RAISE EXCEPTION 'payment_amount_mismatch';
  END IF;

  SELECT * INTO selected_event
  FROM public.payment_events
  WHERE provider = target_provider
    AND provider_event_id = target_event_id
  FOR UPDATE;

  IF FOUND AND selected_event.status = 'processed'::public.payment_event_status THEN
    RETURN pg_catalog.jsonb_build_object(
      'duplicate', TRUE,
      'order_id', selected_order.id,
      'order_status', selected_order.status
    );
  END IF;

  IF FOUND THEN
    UPDATE public.payment_events
    SET
      status = 'processing'::public.payment_event_status,
      attempts = attempts + 1,
      processing_started_at = timezone('utc', now()),
      payload = COALESCE(target_payload, '{}'::JSONB),
      error_code = NULL
    WHERE id = selected_event.id;
  ELSE
    INSERT INTO public.payment_events (
      provider,
      provider_event_id,
      event_type,
      event_created_at,
      status,
      payload
    )
    VALUES (
      target_provider,
      target_event_id,
      target_event_type,
      COALESCE(target_paid_at, timezone('utc', now())),
      'processing'::public.payment_event_status,
      COALESCE(target_payload, '{}'::JSONB)
    );
  END IF;

  SELECT * INTO selected_payment
  FROM public.payments
  WHERE provider = target_provider
    AND provider_payment_id = target_provider_payment_id
  FOR UPDATE;

  IF FOUND AND selected_payment.order_id <> selected_order.id THEN
    RAISE EXCEPTION 'provider_payment_order_mismatch';
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.payments (
      order_id,
      user_id,
      email,
      provider,
      provider_payment_id,
      amount,
      currency,
      status,
      paid_at,
      raw_payload
    )
    SELECT
      selected_order.id,
      selected_order.user_id,
      profile.email,
      target_provider,
      target_provider_payment_id,
      target_amount,
      upper(target_currency),
      CASE target_outcome
        WHEN 'completed' THEN 'completed'::public.payment_status
        WHEN 'refunded' THEN 'refunded'::public.payment_status
        ELSE 'failed'::public.payment_status
      END,
      CASE WHEN target_outcome IN ('completed', 'refunded')
        THEN COALESCE(target_paid_at, timezone('utc', now()))
        ELSE NULL
      END,
      COALESCE(target_payload, '{}'::JSONB)
    FROM public.profiles AS profile
    WHERE profile.id = selected_order.user_id
    RETURNING * INTO selected_payment;

    IF selected_payment.id IS NULL THEN
      RAISE EXCEPTION 'payment_user_profile_not_found';
    END IF;
  ELSE
    UPDATE public.payments
    SET
      status = CASE target_outcome
        WHEN 'completed' THEN
          CASE WHEN status = 'refunded'::public.payment_status
            THEN status ELSE 'completed'::public.payment_status END
        WHEN 'refunded' THEN 'refunded'::public.payment_status
        WHEN 'failed' THEN
          CASE WHEN status IN (
            'completed'::public.payment_status,
            'refunded'::public.payment_status
          ) THEN status ELSE 'failed'::public.payment_status END
        WHEN 'cancelled' THEN
          CASE WHEN status IN (
            'completed'::public.payment_status,
            'refunded'::public.payment_status
          ) THEN status ELSE 'failed'::public.payment_status END
      END,
      paid_at = CASE WHEN target_outcome IN ('completed', 'refunded')
        THEN COALESCE(public.payments.paid_at, target_paid_at, timezone('utc', now()))
        ELSE public.payments.paid_at
      END,
      raw_payload = COALESCE(target_payload, '{}'::JSONB)
    WHERE id = selected_payment.id
    RETURNING * INTO selected_payment;
  END IF;

  IF target_outcome = 'completed' THEN
    IF selected_order.status <> 'refunded'::public.order_status THEN
      UPDATE public.orders
      SET
        status = 'paid'::public.order_status,
        paid_at = COALESCE(paid_at, target_paid_at, timezone('utc', now()))
      WHERE id = selected_order.id
      RETURNING * INTO selected_order;

      entitlement_id := public.grant_course_entitlement_for_order(
        selected_order.id,
        selected_payment.id
      );
    END IF;
  ELSIF target_outcome = 'refunded' THEN
    UPDATE public.orders
    SET status = 'refunded'::public.order_status
    WHERE id = selected_order.id
    RETURNING * INTO selected_order;

    -- Refunds and chargebacks are intentionally reviewed by an Admin. The
    -- provider event never revokes a permanent entitlement automatically.
  ELSIF target_outcome = 'failed' AND selected_order.status NOT IN (
    'paid'::public.order_status,
    'refunded'::public.order_status
  ) THEN
    UPDATE public.orders
    SET status = 'failed'::public.order_status
    WHERE id = selected_order.id
    RETURNING * INTO selected_order;
  ELSIF target_outcome = 'cancelled' AND selected_order.status NOT IN (
    'paid'::public.order_status,
    'refunded'::public.order_status
  ) THEN
    UPDATE public.orders
    SET status = 'cancelled'::public.order_status
    WHERE id = selected_order.id
    RETURNING * INTO selected_order;
  END IF;

  UPDATE public.payment_events
  SET
    status = 'processed'::public.payment_event_status,
    processed_at = timezone('utc', now()),
    error_code = NULL
  WHERE provider = target_provider
    AND provider_event_id = target_event_id;

  RETURN pg_catalog.jsonb_build_object(
    'duplicate', FALSE,
    'order_id', selected_order.id,
    'order_status', selected_order.status,
    'payment_id', selected_payment.id,
    'payment_status', selected_payment.status,
    'entitlement_id', entitlement_id,
    'requires_manual_review', target_outcome = 'refunded'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_one_time_payment_event(
  public.payment_provider,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TIMESTAMPTZ,
  JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_one_time_payment_event(
  public.payment_provider,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TIMESTAMPTZ,
  JSONB
) TO service_role;
