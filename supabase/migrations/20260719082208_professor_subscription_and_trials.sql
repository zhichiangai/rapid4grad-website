-- RAPID4GRAD V2 Task 5
-- Professor Lab recurring subscriptions, a one-time cardless trial, and
-- provider-neutral subscription event processing.

ALTER TABLE public.orders
  ADD COLUMN lab_id UUID REFERENCES public.labs(id) ON DELETE RESTRICT,
  ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE RESTRICT;

CREATE INDEX orders_lab_created_idx
  ON public.orders(lab_id, created_at DESC)
  WHERE lab_id IS NOT NULL;
CREATE INDEX orders_subscription_idx
  ON public.orders(subscription_id)
  WHERE subscription_id IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN grace_ends_at TIMESTAMPTZ,
  ADD CONSTRAINT subscriptions_trial_period_consistent CHECK (
    (trial_started_at IS NULL AND trial_ends_at IS NULL)
    OR (
      trial_started_at IS NOT NULL
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at > trial_started_at
    )
  );

CREATE TABLE public.professor_subscription_trials (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  payer_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  lab_id UUID NOT NULL UNIQUE REFERENCES public.labs(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.professor_subscription_trials ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.professor_subscription_trials TO service_role;
GRANT SELECT ON TABLE public.professor_subscription_trials TO authenticated;

CREATE POLICY "professor_subscription_trials_select_owner_or_admin"
ON public.professor_subscription_trials
FOR SELECT TO authenticated
USING (
  payer_user_id = (SELECT auth.uid())
  OR app_private.is_admin()
);

CREATE OR REPLACE FUNCTION app_private.subscription_is_functional(
  target_status public.subscription_status,
  target_period_start TIMESTAMPTZ,
  target_period_end TIMESTAMPTZ,
  target_grace_ends_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN target_status IN (
      'active'::public.subscription_status,
      'trialing'::public.subscription_status
    ) THEN
      target_period_start <= timezone('utc', now())
      AND target_period_end > timezone('utc', now())
    WHEN target_status = 'past_due'::public.subscription_status THEN
      target_grace_ends_at IS NOT NULL
      AND target_grace_ends_at > timezone('utc', now())
    ELSE FALSE
  END;
$$;

REVOKE ALL ON FUNCTION app_private.subscription_is_functional(
  public.subscription_status,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.subscription_is_functional(
  public.subscription_status,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TIMESTAMPTZ
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_active_lab_subscription(target_lab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.lab_id = target_lab_id
      AND app_private.subscription_is_functional(
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.grace_ends_at
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.has_lab_basic_access(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_memberships AS membership
    JOIN public.subscriptions AS subscription
      ON subscription.lab_id = membership.lab_id
    WHERE membership.user_id = target_user_id
      AND membership.status = 'active'::public.lab_membership_status
      AND app_private.subscription_is_functional(
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.grace_ends_at
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.enforce_lab_membership_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lab_owner UUID;
  lab_state public.lab_status;
  user_profile_role public.profile_role;
  user_account_state public.account_status;
  current_plan public.professor_plan_key;
  seat_limit INTEGER;
  active_count INTEGER;
BEGIN
  IF NEW.status <> 'active'::public.lab_membership_status THEN
    RETURN NEW;
  END IF;

  SELECT owner_professor_id, status
  INTO lab_owner, lab_state
  FROM public.labs
  WHERE id = NEW.lab_id
  FOR UPDATE;

  IF NOT FOUND OR lab_state <> 'active'::public.lab_status THEN
    RAISE EXCEPTION 'active_lab_not_found';
  END IF;

  SELECT role, account_status
  INTO user_profile_role, user_account_state
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NOT FOUND OR user_account_state <> 'active'::public.account_status THEN
    RAISE EXCEPTION 'active_profile_not_found';
  END IF;

  IF NEW.role = 'student'::public.lab_role
     AND user_profile_role <> 'student'::public.profile_role THEN
    RAISE EXCEPTION 'student_profile_role_required';
  END IF;

  IF NEW.role IN ('professor'::public.lab_role, 'assistant'::public.lab_role)
     AND user_profile_role <> 'professor'::public.profile_role THEN
    RAISE EXCEPTION 'professor_profile_role_required';
  END IF;

  IF NEW.role = 'professor'::public.lab_role AND NEW.user_id = lab_owner THEN
    RETURN NEW;
  END IF;

  SELECT subscription.plan_key
  INTO current_plan
  FROM public.subscriptions AS subscription
  WHERE subscription.lab_id = NEW.lab_id
    AND app_private.subscription_is_functional(
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.grace_ends_at
    )
  ORDER BY subscription.current_period_end DESC
  LIMIT 1;

  IF current_plan IS NULL THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  IF NEW.role = 'student'::public.lab_role THEN
    seat_limit := CASE current_plan
      WHEN 'professor_lab_standard'::public.professor_plan_key THEN 15
      WHEN 'professor_lab_plus'::public.professor_plan_key THEN 30
      ELSE 2147483647
    END;

    SELECT count(*)
    INTO active_count
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = NEW.lab_id
      AND membership.role = 'student'::public.lab_role
      AND membership.status = 'active'::public.lab_membership_status
      AND membership.id <> NEW.id;

    IF active_count >= seat_limit THEN
      RAISE EXCEPTION 'student_seat_limit_reached';
    END IF;
  ELSIF NEW.role = 'assistant'::public.lab_role THEN
    SELECT count(*)
    INTO active_count
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = NEW.lab_id
      AND membership.role = 'assistant'::public.lab_role
      AND membership.status = 'active'::public.lab_membership_status
      AND membership.id <> NEW.id;

    IF active_count >= 3 THEN
      RAISE EXCEPTION 'assistant_limit_reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_professor_subscription_trial(
  target_payer_user_id UUID,
  target_lab_id UUID,
  target_plan_key public.professor_plan_key,
  target_billing_interval public.subscription_interval
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_product public.products%ROWTYPE;
  new_subscription_id UUID;
  trial_start TIMESTAMPTZ := timezone('utc', now());
  trial_end TIMESTAMPTZ := trial_start + interval '30 days';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_payer_user_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(target_lab_id::TEXT, 0));

  IF target_plan_key NOT IN (
    'professor_lab_standard'::public.professor_plan_key,
    'professor_lab_plus'::public.professor_plan_key
  ) THEN
    RAISE EXCEPTION 'self_service_plan_required';
  END IF;

  IF target_billing_interval NOT IN (
    'month'::public.subscription_interval,
    'year'::public.subscription_interval
  ) THEN
    RAISE EXCEPTION 'monthly_or_yearly_interval_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.labs AS lab
    JOIN public.profiles AS profile ON profile.id = lab.owner_professor_id
    WHERE lab.id = target_lab_id
      AND lab.owner_professor_id = target_payer_user_id
      AND lab.status = 'active'::public.lab_status
      AND profile.role = 'professor'::public.profile_role
      AND profile.account_status = 'active'::public.account_status
  ) THEN
    RAISE EXCEPTION 'active_lab_owner_required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.professor_subscription_trials AS trial
    WHERE trial.payer_user_id = target_payer_user_id
  ) THEN
    RAISE EXCEPTION 'professor_trial_already_claimed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.lab_id = target_lab_id
      AND subscription.status IN (
        'incomplete'::public.subscription_status,
        'trialing'::public.subscription_status,
        'active'::public.subscription_status,
        'past_due'::public.subscription_status,
        'unpaid'::public.subscription_status
      )
  ) THEN
    RAISE EXCEPTION 'current_lab_subscription_exists';
  END IF;

  SELECT *
  INTO selected_product
  FROM public.products AS product
  WHERE product.slug = CASE target_plan_key
      WHEN 'professor_lab_standard'::public.professor_plan_key
        THEN 'professor-lab-standard'
      WHEN 'professor_lab_plus'::public.professor_plan_key
        THEN 'professor-lab-plus'
    END
    AND product.product_type = 'professor_subscription'::public.product_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'professor_subscription_product_not_found';
  END IF;

  INSERT INTO public.subscriptions(
    lab_id,
    payer_user_id,
    product_id,
    product_price_id,
    provider,
    plan_key,
    status,
    billing_interval,
    current_period_start,
    current_period_end,
    trial_started_at,
    trial_ends_at,
    metadata
  )
  VALUES (
    target_lab_id,
    target_payer_user_id,
    selected_product.id,
    NULL,
    'manual'::public.payment_provider,
    target_plan_key,
    'trialing'::public.subscription_status,
    target_billing_interval,
    trial_start,
    trial_end,
    trial_start,
    trial_end,
    jsonb_build_object('source', 'cardless_trial')
  )
  RETURNING id INTO new_subscription_id;

  INSERT INTO public.subscription_items(subscription_id, feature_key, quantity)
  VALUES
    (new_subscription_id, 'lab_dashboard', 1),
    (new_subscription_id, 'lab_basic', 1),
    (new_subscription_id, 'pdf_audit_pool', 0),
    (
      new_subscription_id,
      'student_seats',
      CASE target_plan_key
        WHEN 'professor_lab_standard'::public.professor_plan_key THEN 15
        ELSE 30
      END
    );

  INSERT INTO public.professor_subscription_trials(
    payer_user_id,
    lab_id,
    subscription_id,
    claimed_at
  )
  VALUES (
    target_payer_user_id,
    target_lab_id,
    new_subscription_id,
    trial_start
  );

  RETURN jsonb_build_object(
    'subscriptionId', new_subscription_id,
    'status', 'trialing',
    'trialEndsAt', trial_end,
    'planKey', target_plan_key,
    'billingInterval', target_billing_interval
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_professor_subscription_checkout_order(
  target_payer_user_id UUID,
  target_lab_id UUID,
  target_plan_key public.professor_plan_key,
  target_billing_interval public.subscription_interval,
  target_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_product public.products%ROWTYPE;
  selected_price public.product_prices%ROWTYPE;
  selected_subscription public.subscriptions%ROWTYPE;
  selected_order public.orders%ROWTYPE;
  provider_order TEXT;
  desired_price_interval public.price_interval;
  placeholder_end TIMESTAMPTZ := timezone('utc', now()) + interval '15 minutes';
  is_upgrade BOOLEAN := FALSE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_payer_user_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(target_lab_id::TEXT, 0));

  IF char_length(target_idempotency_key) < 16
     OR char_length(target_idempotency_key) > 160 THEN
    RAISE EXCEPTION 'invalid_idempotency_key';
  END IF;

  IF target_plan_key NOT IN (
    'professor_lab_standard'::public.professor_plan_key,
    'professor_lab_plus'::public.professor_plan_key
  ) THEN
    RAISE EXCEPTION 'self_service_plan_required';
  END IF;

  desired_price_interval := CASE target_billing_interval
    WHEN 'month'::public.subscription_interval THEN 'month'::public.price_interval
    WHEN 'year'::public.subscription_interval THEN 'year'::public.price_interval
    ELSE NULL
  END;

  IF desired_price_interval IS NULL THEN
    RAISE EXCEPTION 'monthly_or_yearly_interval_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.labs AS lab
    WHERE lab.id = target_lab_id
      AND lab.owner_professor_id = target_payer_user_id
      AND lab.status = 'active'::public.lab_status
  ) THEN
    RAISE EXCEPTION 'active_lab_owner_required';
  END IF;

  SELECT *
  INTO selected_order
  FROM public.orders AS existing_order
  WHERE existing_order.user_id = target_payer_user_id
    AND existing_order.idempotency_key = target_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'orderId', selected_order.id,
      'subscriptionId', selected_order.subscription_id,
      'providerOrderId', selected_order.provider_order_id,
      'amount', selected_order.amount,
      'currency', selected_order.currency,
      'productName', (
        SELECT product.name
        FROM public.products AS product
        WHERE product.id = selected_order.product_id
      ),
      'planKey', (
        SELECT CASE product.slug
          WHEN 'professor-lab-plus' THEN 'professor_lab_plus'
          ELSE 'professor_lab_standard'
        END
        FROM public.products AS product
        WHERE product.id = selected_order.product_id
      ),
      'billingInterval', (
        SELECT CASE price.interval
          WHEN 'year'::public.price_interval THEN 'year'
          ELSE 'month'
        END
        FROM public.product_prices AS price
        WHERE price.id = selected_order.product_price_id
      ),
      'isUpgrade', COALESCE(
        (selected_order.raw_checkout_payload->>'subscriptionUpgrade')::BOOLEAN,
        FALSE
      ),
      'requiresProviderCancellation', COALESCE(
        (selected_order.raw_checkout_payload->>'subscriptionUpgrade')::BOOLEAN,
        FALSE
      ) AND NOT COALESCE(
        (selected_order.raw_checkout_payload->>'providerScheduleCanceled')::BOOLEAN,
        FALSE
      ),
      'previousProviderSubscriptionId',
        selected_order.raw_checkout_payload->>'previousProviderSubscriptionId',
      'reused', TRUE
    );
  END IF;

  SELECT *
  INTO selected_product
  FROM public.products AS product
  WHERE product.slug = CASE target_plan_key
      WHEN 'professor_lab_standard'::public.professor_plan_key
        THEN 'professor-lab-standard'
      WHEN 'professor_lab_plus'::public.professor_plan_key
        THEN 'professor-lab-plus'
    END
    AND product.product_type = 'professor_subscription'::public.product_type
    AND product.is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'professor_subscription_product_not_available';
  END IF;

  SELECT *
  INTO selected_price
  FROM public.product_prices AS price
  WHERE price.product_id = selected_product.id
    AND price.provider = 'ecpay'::public.payment_provider
    AND price.interval = desired_price_interval
    AND price.is_active = TRUE
    AND price.amount IS NOT NULL
    AND price.amount > 0
  ORDER BY price.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'professor_subscription_price_not_configured';
  END IF;

  SELECT *
  INTO selected_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.lab_id = target_lab_id
    AND subscription.status IN (
      'incomplete'::public.subscription_status,
      'trialing'::public.subscription_status,
      'active'::public.subscription_status,
      'past_due'::public.subscription_status,
      'unpaid'::public.subscription_status
    )
  FOR UPDATE;

  IF FOUND THEN
    IF selected_subscription.status = 'active'::public.subscription_status
       AND selected_subscription.plan_key = target_plan_key
       AND selected_subscription.billing_interval = target_billing_interval
       AND selected_subscription.cancel_at_period_end = FALSE THEN
      RAISE EXCEPTION 'requested_subscription_already_active';
    END IF;

    IF selected_subscription.plan_key = 'professor_lab_plus'::public.professor_plan_key
       AND target_plan_key = 'professor_lab_standard'::public.professor_plan_key
       AND selected_subscription.status = 'active'::public.subscription_status THEN
      RAISE EXCEPTION 'self_service_downgrade_not_supported';
    END IF;

    IF selected_subscription.provider_subscription_id IS NOT NULL
       AND selected_subscription.status IN (
         'active'::public.subscription_status,
         'past_due'::public.subscription_status,
         'unpaid'::public.subscription_status
       ) THEN
      IF selected_subscription.plan_key = 'professor_lab_standard'::public.professor_plan_key
         AND target_plan_key = 'professor_lab_plus'::public.professor_plan_key THEN
        is_upgrade := TRUE;
      ELSE
        RAISE EXCEPTION 'provider_plan_change_requires_manual_support';
      END IF;
    END IF;
  ELSE
    INSERT INTO public.subscriptions(
      lab_id,
      payer_user_id,
      product_id,
      product_price_id,
      provider,
      plan_key,
      status,
      billing_interval,
      current_period_start,
      current_period_end,
      metadata
    )
    VALUES (
      target_lab_id,
      target_payer_user_id,
      selected_product.id,
      selected_price.id,
      'ecpay'::public.payment_provider,
      target_plan_key,
      'incomplete'::public.subscription_status,
      target_billing_interval,
      timezone('utc', now()),
      placeholder_end,
      jsonb_build_object('source', 'ecpay_checkout_pending')
    )
    RETURNING * INTO selected_subscription;
  END IF;

  IF is_upgrade THEN
    SELECT *
    INTO selected_order
    FROM public.orders AS existing_order
    WHERE existing_order.user_id = target_payer_user_id
      AND existing_order.subscription_id = selected_subscription.id
      AND existing_order.product_id = selected_product.id
      AND existing_order.product_price_id = selected_price.id
      AND existing_order.status IN (
        'pending'::public.order_status,
        'processing'::public.order_status
      )
    ORDER BY existing_order.created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'orderId', selected_order.id,
        'subscriptionId', selected_subscription.id,
        'providerOrderId', selected_order.provider_order_id,
        'amount', selected_order.amount,
        'currency', selected_order.currency,
        'productName', selected_product.name,
        'planKey', target_plan_key,
        'billingInterval', target_billing_interval,
        'isUpgrade', TRUE,
        'requiresProviderCancellation', NOT selected_subscription.cancel_at_period_end,
        'previousProviderSubscriptionId', selected_subscription.provider_subscription_id,
        'reused', TRUE
      );
    END IF;
  END IF;

  provider_order := 'R4G' || upper(substr(replace(extensions.gen_random_uuid()::TEXT, '-', ''), 1, 17));

  INSERT INTO public.orders(
    user_id,
    product_id,
    product_price_id,
    lab_id,
    subscription_id,
    amount,
    currency,
    status,
    provider,
    provider_order_id,
    idempotency_key,
    raw_checkout_payload
  )
  VALUES (
    target_payer_user_id,
    selected_product.id,
    selected_price.id,
    target_lab_id,
    selected_subscription.id,
    selected_price.amount,
    upper(selected_price.currency),
    'pending'::public.order_status,
    'ecpay'::public.payment_provider,
    provider_order,
    target_idempotency_key,
    jsonb_build_object(
      'subscriptionUpgrade', is_upgrade,
      'previousProviderSubscriptionId', CASE
        WHEN is_upgrade THEN selected_subscription.provider_subscription_id
        ELSE NULL
      END,
      'providerScheduleCanceled', CASE
        WHEN is_upgrade THEN selected_subscription.cancel_at_period_end
        ELSE FALSE
      END
    )
  )
  RETURNING * INTO selected_order;

  RETURN jsonb_build_object(
    'orderId', selected_order.id,
    'subscriptionId', selected_subscription.id,
    'providerOrderId', selected_order.provider_order_id,
    'amount', selected_order.amount,
    'currency', selected_order.currency,
    'productName', selected_product.name,
    'planKey', target_plan_key,
    'billingInterval', target_billing_interval,
    'isUpgrade', is_upgrade,
    'requiresProviderCancellation', is_upgrade AND NOT selected_subscription.cancel_at_period_end,
    'previousProviderSubscriptionId', CASE
      WHEN is_upgrade THEN selected_subscription.provider_subscription_id
      ELSE NULL
    END,
    'reused', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_professor_subscription_upgrade(
  target_payer_user_id UUID,
  target_subscription_id UUID,
  target_order_id UUID,
  target_previous_provider_subscription_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_subscription public.subscriptions%ROWTYPE;
  selected_order public.orders%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_subscription_id::TEXT, 0));

  SELECT *
  INTO selected_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.id = target_subscription_id
    AND subscription.payer_user_id = target_payer_user_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_subscription.plan_key <> 'professor_lab_standard'::public.professor_plan_key
     OR selected_subscription.provider <> 'ecpay'::public.payment_provider
     OR selected_subscription.provider_subscription_id IS DISTINCT FROM target_previous_provider_subscription_id
     OR selected_subscription.status NOT IN (
       'active'::public.subscription_status,
       'past_due'::public.subscription_status,
       'unpaid'::public.subscription_status
     ) THEN
    RAISE EXCEPTION 'eligible_standard_subscription_required';
  END IF;

  SELECT payment_order.*
  INTO selected_order
  FROM public.orders AS payment_order
  JOIN public.products AS product ON product.id = payment_order.product_id
  WHERE payment_order.id = target_order_id
    AND payment_order.user_id = target_payer_user_id
    AND payment_order.subscription_id = target_subscription_id
    AND payment_order.provider = 'ecpay'::public.payment_provider
    AND payment_order.status IN (
      'pending'::public.order_status,
      'processing'::public.order_status
    )
    AND product.slug = 'professor-lab-plus'
    AND COALESCE(
      (payment_order.raw_checkout_payload->>'subscriptionUpgrade')::BOOLEAN,
      FALSE
    )
  FOR UPDATE OF payment_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'valid_plus_upgrade_order_required';
  END IF;

  UPDATE public.subscriptions
  SET cancel_at_period_end = TRUE,
      canceled_at = COALESCE(canceled_at, timezone('utc', now())),
      metadata = metadata || jsonb_build_object(
        'pendingUpgradeOrderId', target_order_id,
        'pendingUpgradePlan', 'professor_lab_plus',
        'retiredProviderSubscriptionIds',
          CASE
            WHEN COALESCE(
              metadata->'retiredProviderSubscriptionIds',
              '[]'::JSONB
            ) ? target_previous_provider_subscription_id
              THEN COALESCE(
                metadata->'retiredProviderSubscriptionIds',
                '[]'::JSONB
              )
            ELSE COALESCE(
              metadata->'retiredProviderSubscriptionIds',
              '[]'::JSONB
            ) || jsonb_build_array(target_previous_provider_subscription_id)
          END
      ),
      updated_at = timezone('utc', now())
  WHERE id = target_subscription_id;

  UPDATE public.orders
  SET raw_checkout_payload = COALESCE(raw_checkout_payload, '{}'::JSONB)
        || jsonb_build_object(
          'providerScheduleCanceled', TRUE,
          'providerScheduleCanceledAt', timezone('utc', now())
        ),
      updated_at = timezone('utc', now())
  WHERE id = target_order_id;

  RETURN jsonb_build_object(
    'subscriptionId', target_subscription_id,
    'orderId', target_order_id,
    'providerScheduleCanceled', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_professor_subscription_event(
  target_provider_event_id TEXT,
  target_provider_order_id TEXT,
  target_provider_payment_id TEXT,
  target_outcome TEXT,
  target_amount INTEGER,
  target_currency TEXT,
  target_event_created_at TIMESTAMPTZ,
  target_period_end TIMESTAMPTZ,
  target_payload JSONB,
  target_error_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_order public.orders%ROWTYPE;
  selected_subscription public.subscriptions%ROWTYPE;
  selected_profile public.profiles%ROWTYPE;
  event_inserted BOOLEAN;
  incoming_status public.subscription_status;
  existing_rank INTEGER;
  incoming_rank INTEGER;
  should_apply BOOLEAN;
  payment_id UUID;
  is_upgrade_order BOOLEAN;
  is_retired_provider_order BOOLEAN;
BEGIN
  INSERT INTO public.payment_events(
    provider,
    provider_event_id,
    event_type,
    event_created_at,
    status,
    payload
  )
  VALUES (
    'ecpay'::public.payment_provider,
    target_provider_event_id,
    'professor_subscription.' || target_outcome,
    target_event_created_at,
    'processing'::public.payment_event_status,
    target_payload
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING TRUE INTO event_inserted;

  IF NOT COALESCE(event_inserted, FALSE) THEN
    RETURN jsonb_build_object('duplicate', TRUE, 'applied', FALSE);
  END IF;

  SELECT *
  INTO selected_order
  FROM public.orders AS payment_order
  WHERE payment_order.provider = 'ecpay'::public.payment_provider
    AND payment_order.provider_order_id = target_provider_order_id
  FOR UPDATE;

  IF NOT FOUND OR selected_order.subscription_id IS NULL THEN
    RAISE EXCEPTION 'subscription_order_not_found';
  END IF;

  SELECT *
  INTO selected_subscription
  FROM public.subscriptions
  WHERE id = selected_order.subscription_id
  FOR UPDATE;

  is_upgrade_order := COALESCE(
    (selected_order.raw_checkout_payload->>'subscriptionUpgrade')::BOOLEAN,
    FALSE
  );
  is_retired_provider_order := COALESCE(
    selected_subscription.metadata->'retiredProviderSubscriptionIds',
    '[]'::JSONB
  ) ? target_provider_order_id;

  IF target_amount <> selected_order.amount
     OR upper(target_currency) <> upper(selected_order.currency) THEN
    RAISE EXCEPTION 'subscription_payment_amount_mismatch';
  END IF;

  incoming_status := CASE target_outcome
    WHEN 'paid' THEN 'active'::public.subscription_status
    WHEN 'failed' THEN 'past_due'::public.subscription_status
    WHEN 'unpaid' THEN 'unpaid'::public.subscription_status
    WHEN 'canceled' THEN 'canceled'::public.subscription_status
    ELSE NULL
  END;

  IF incoming_status IS NULL THEN
    RAISE EXCEPTION 'unsupported_subscription_outcome';
  END IF;

  IF is_retired_provider_order THEN
    UPDATE public.payment_events
    SET status = 'processed'::public.payment_event_status,
        processed_at = timezone('utc', now()),
        error_code = NULL,
        updated_at = timezone('utc', now())
    WHERE provider = 'ecpay'::public.payment_provider
      AND provider_event_id = target_provider_event_id;

    RETURN jsonb_build_object(
      'duplicate', FALSE,
      'applied', FALSE,
      'retiredProviderOrder', TRUE,
      'subscriptionId', selected_subscription.id,
      'status', selected_subscription.status
    );
  END IF;

  IF is_upgrade_order
     AND incoming_status = 'past_due'::public.subscription_status
     AND selected_order.status IN (
       'pending'::public.order_status,
       'processing'::public.order_status
     ) THEN
    UPDATE public.orders
    SET status = 'failed'::public.order_status,
        updated_at = timezone('utc', now())
    WHERE id = selected_order.id;

    UPDATE public.payment_events
    SET status = 'processed'::public.payment_event_status,
        processed_at = timezone('utc', now()),
        error_code = target_error_code,
        updated_at = timezone('utc', now())
    WHERE provider = 'ecpay'::public.payment_provider
      AND provider_event_id = target_provider_event_id;

    RETURN jsonb_build_object(
      'duplicate', FALSE,
      'applied', FALSE,
      'upgradePaymentFailed', TRUE,
      'subscriptionId', selected_subscription.id,
      'status', selected_subscription.status
    );
  END IF;

  existing_rank := CASE selected_subscription.status
    WHEN 'canceled'::public.subscription_status THEN 50
    WHEN 'expired'::public.subscription_status THEN 50
    WHEN 'unpaid'::public.subscription_status THEN 40
    WHEN 'past_due'::public.subscription_status THEN 30
    WHEN 'incomplete'::public.subscription_status THEN 20
    ELSE 10
  END;
  incoming_rank := CASE incoming_status
    WHEN 'canceled'::public.subscription_status THEN 50
    WHEN 'expired'::public.subscription_status THEN 50
    WHEN 'unpaid'::public.subscription_status THEN 40
    WHEN 'past_due'::public.subscription_status THEN 30
    WHEN 'incomplete'::public.subscription_status THEN 20
    ELSE 10
  END;

  should_apply := selected_subscription.last_provider_event_created_at IS NULL
    OR target_event_created_at > selected_subscription.last_provider_event_created_at
    OR (
      target_event_created_at = selected_subscription.last_provider_event_created_at
      AND incoming_rank >= existing_rank
    );

  IF should_apply THEN
    IF incoming_status = 'active'::public.subscription_status THEN
      IF target_period_end <= target_event_created_at THEN
        RAISE EXCEPTION 'invalid_subscription_period';
      END IF;

      UPDATE public.subscriptions
      SET
        product_id = selected_order.product_id,
        product_price_id = selected_order.product_price_id,
        provider = 'ecpay'::public.payment_provider,
        provider_subscription_id = target_provider_order_id,
        plan_key = CASE
          WHEN EXISTS (
            SELECT 1 FROM public.products AS product
            WHERE product.id = selected_order.product_id
              AND product.slug = 'professor-lab-plus'
          ) THEN 'professor_lab_plus'::public.professor_plan_key
          ELSE 'professor_lab_standard'::public.professor_plan_key
        END,
        billing_interval = CASE
          WHEN EXISTS (
            SELECT 1 FROM public.product_prices AS price
            WHERE price.id = selected_order.product_price_id
              AND price.interval = 'year'::public.price_interval
          ) THEN 'year'::public.subscription_interval
          ELSE 'month'::public.subscription_interval
        END,
        status = incoming_status,
        current_period_start = target_event_created_at,
        current_period_end = target_period_end,
        cancel_at_period_end = FALSE,
        canceled_at = NULL,
        grace_ends_at = NULL,
        last_provider_event_created_at = target_event_created_at,
        last_provider_event_id = target_provider_event_id,
        metadata = selected_subscription.metadata || jsonb_build_object('lastOutcome', target_outcome),
        updated_at = timezone('utc', now())
      WHERE id = selected_subscription.id;

      UPDATE public.orders
      SET status = 'paid'::public.order_status,
          paid_at = COALESCE(paid_at, target_event_created_at),
          updated_at = timezone('utc', now())
      WHERE id = selected_order.id;

      SELECT *
      INTO selected_profile
      FROM public.profiles
      WHERE id = selected_order.user_id;

      INSERT INTO public.payments(
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
      VALUES (
        selected_order.id,
        selected_order.user_id,
        selected_profile.email,
        'ecpay'::public.payment_provider,
        target_provider_payment_id,
        target_amount,
        upper(target_currency),
        'completed'::public.payment_status,
        target_event_created_at,
        target_payload
      )
      ON CONFLICT (provider, provider_payment_id)
        WHERE provider_payment_id IS NOT NULL
      DO UPDATE SET
        status = 'completed'::public.payment_status,
        paid_at = EXCLUDED.paid_at,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = timezone('utc', now())
      RETURNING id INTO payment_id;
    ELSIF incoming_status = 'past_due'::public.subscription_status THEN
      UPDATE public.subscriptions
      SET status = incoming_status,
          grace_ends_at = target_event_created_at + interval '15 days',
          last_provider_event_created_at = target_event_created_at,
          last_provider_event_id = target_provider_event_id,
          metadata = selected_subscription.metadata || jsonb_build_object(
            'lastOutcome', target_outcome,
            'lastErrorCode', target_error_code
          ),
          updated_at = timezone('utc', now())
      WHERE id = selected_subscription.id;
    ELSE
      UPDATE public.subscriptions
      SET status = incoming_status,
          cancel_at_period_end = FALSE,
          canceled_at = CASE
            WHEN incoming_status = 'canceled'::public.subscription_status
              THEN target_event_created_at
            ELSE canceled_at
          END,
          grace_ends_at = NULL,
          last_provider_event_created_at = target_event_created_at,
          last_provider_event_id = target_provider_event_id,
          metadata = selected_subscription.metadata || jsonb_build_object(
            'lastOutcome', target_outcome,
            'lastErrorCode', target_error_code
          ),
          updated_at = timezone('utc', now())
      WHERE id = selected_subscription.id;
    END IF;
  END IF;

  UPDATE public.payment_events
  SET status = 'processed'::public.payment_event_status,
      processed_at = timezone('utc', now()),
      error_code = NULL,
      updated_at = timezone('utc', now())
  WHERE provider = 'ecpay'::public.payment_provider
    AND provider_event_id = target_provider_event_id;

  RETURN jsonb_build_object(
    'duplicate', FALSE,
    'applied', should_apply,
    'subscriptionId', selected_subscription.id,
    'status', CASE WHEN should_apply THEN incoming_status ELSE selected_subscription.status END,
    'paymentId', payment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.payment_events
    SET status = 'failed'::public.payment_event_status,
        processed_at = timezone('utc', now()),
        error_code = left(SQLERRM, 200),
        updated_at = timezone('utc', now())
    WHERE provider = 'ecpay'::public.payment_provider
      AND provider_event_id = target_provider_event_id;
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_professor_subscription_cancel_at_period_end(
  target_payer_user_id UUID,
  target_subscription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_subscription public.subscriptions%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.id = target_subscription_id
    AND subscription.payer_user_id = target_payer_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  IF selected_subscription.status = 'trialing'::public.subscription_status
     AND selected_subscription.provider = 'manual'::public.payment_provider THEN
    UPDATE public.subscriptions
    SET status = 'canceled'::public.subscription_status,
        canceled_at = timezone('utc', now()),
        cancel_at_period_end = FALSE,
        updated_at = timezone('utc', now())
    WHERE id = selected_subscription.id;
  ELSIF selected_subscription.status IN (
    'active'::public.subscription_status,
    'past_due'::public.subscription_status
  ) THEN
    UPDATE public.subscriptions
    SET cancel_at_period_end = TRUE,
        canceled_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = selected_subscription.id;
  ELSE
    RAISE EXCEPTION 'subscription_cannot_be_canceled';
  END IF;

  RETURN jsonb_build_object(
    'subscriptionId', selected_subscription.id,
    'cancelAtPeriodEnd', selected_subscription.status <> 'trialing'::public.subscription_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_professor_subscription_trial(
  UUID,
  UUID,
  public.professor_plan_key,
  public.subscription_interval
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_professor_subscription_checkout_order(
  UUID,
  UUID,
  public.professor_plan_key,
  public.subscription_interval,
  TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_professor_subscription_upgrade(
  UUID,
  UUID,
  UUID,
  TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_professor_subscription_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  JSONB,
  TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_professor_subscription_cancel_at_period_end(
  UUID,
  UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.start_professor_subscription_trial(
  UUID,
  UUID,
  public.professor_plan_key,
  public.subscription_interval
) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_professor_subscription_checkout_order(
  UUID,
  UUID,
  public.professor_plan_key,
  public.subscription_interval,
  TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_professor_subscription_upgrade(
  UUID,
  UUID,
  UUID,
  TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_professor_subscription_event(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  JSONB,
  TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_professor_subscription_cancel_at_period_end(
  UUID,
  UUID
) TO service_role;

UPDATE public.products
SET is_active = TRUE,
    updated_at = timezone('utc', now())
WHERE slug IN ('professor-lab-standard', 'professor-lab-plus');

COMMENT ON TABLE public.professor_subscription_trials IS
  'One cardless 30-day Professor Lab trial per payer account. No PDF credit row is created by Task 5.';
COMMENT ON COLUMN public.subscriptions.grace_ends_at IS
  'A past_due subscription remains functional through this timestamp; RAPID4GRAD V2 uses a 15-day grace period.';
COMMENT ON FUNCTION public.start_professor_subscription_trial(
  UUID,
  UUID,
  public.professor_plan_key,
  public.subscription_interval
) IS
  'Service-only atomic one-time cardless trial claim. The trial is app-managed and does not create an ECPay zero-value recurring order.';
COMMENT ON FUNCTION public.prepare_professor_subscription_upgrade(
  UUID,
  UUID,
  UUID,
  TEXT
) IS
  'Service-only transition after the previous ECPay recurring schedule is stopped. Retires old provider events before the Plus checkout is presented.';
