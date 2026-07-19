\set ON_ERROR_STOP on
\set professor_one 'a1000000-0000-0000-0000-000000000001'
\set professor_two 'a1000000-0000-0000-0000-000000000002'

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'assertion_failed: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT id, 'authenticated', 'authenticated', email, 'local-only',
  timezone('utc', now()), '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', name), timezone('utc', now()), timezone('utc', now())
FROM (VALUES
  (:'professor_one'::UUID, 'professor-subscription-one@local.test', 'Professor One'),
  (:'professor_two'::UUID, 'professor-subscription-two@local.test', 'Professor Two')
) AS fixture(id, email, name);

INSERT INTO auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT
  ('b1000000-0000-0000-0000-' || lpad(series::TEXT, 12, '0'))::UUID,
  'authenticated', 'authenticated', 'seat-' || series || '@local.test',
  'local-only', timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', 'Seat ' || series),
  timezone('utc', now()), timezone('utc', now())
FROM generate_series(1, 31) AS series;

UPDATE public.profiles SET role = 'professor'
WHERE id IN (:'professor_one'::UUID, :'professor_two'::UUID);

SELECT public.create_professor_lab(:'professor_one'::UUID, 'Subscription Lab', 'Local') AS lab_one \gset
SELECT public.create_professor_lab(:'professor_two'::UUID, 'Yearly Lab', 'Local') AS lab_two \gset

DO $$
BEGIN
  BEGIN
    PERFORM public.create_professor_lab(
      'a1000000-0000-0000-0000-000000000001'::UUID,
      'Second Lab',
      'Local'
    );
    RAISE EXCEPTION 'second active Lab unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%professor_already_owns_active_lab%' THEN RAISE; END IF;
  END;
END;
$$;

SELECT
  (payload->>'subscriptionId')::UUID AS trial_subscription_id,
  payload->>'trialEndsAt' AS trial_ends_at
FROM (
  SELECT public.start_professor_subscription_trial(
    :'professor_one'::UUID,
    :'lab_one'::UUID,
    'professor_lab_standard',
    'month'
  ) AS payload
) AS trial \gset

SELECT pg_temp.assert_true(
  (SELECT status = 'trialing' AND provider = 'manual'
   FROM public.subscriptions WHERE id = :'trial_subscription_id'::UUID),
  'trial must be app-managed without card binding'
);
SELECT pg_temp.assert_true(
  (SELECT trial_ends_at - trial_started_at = interval '30 days'
   FROM public.subscriptions WHERE id = :'trial_subscription_id'::UUID),
  'trial must last exactly 30 days'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.lab_usage_credits WHERE lab_id = :'lab_one'::UUID),
  'Task 5 must not invent PDF quotas'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.start_professor_subscription_trial(
      'a1000000-0000-0000-0000-000000000001'::UUID,
      (SELECT id FROM public.labs
       WHERE owner_professor_id = 'a1000000-0000-0000-0000-000000000001'::UUID
         AND status = 'active'),
      'professor_lab_plus',
      'year'
    );
    RAISE EXCEPTION 'second trial unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%professor_trial_already_claimed%' THEN RAISE; END IF;
  END;
END;
$$;

-- Isolated fixture prices; these are not product pricing decisions.
INSERT INTO public.product_prices(
  product_id, provider, currency, amount, interval, is_active, metadata
)
SELECT product.id, 'ecpay', 'TWD', fixture.amount, fixture.interval::public.price_interval,
  TRUE, '{"fixture_only":true}'::JSONB
FROM (VALUES
  ('professor-lab-standard', 100, 'month'),
  ('professor-lab-standard', 1000, 'year'),
  ('professor-lab-plus', 200, 'month'),
  ('professor-lab-plus', 2000, 'year')
) AS fixture(slug, amount, interval)
JOIN public.products AS product ON product.slug = fixture.slug;

SELECT
  (payload->>'orderId')::UUID AS standard_order_id,
  payload->>'providerOrderId' AS standard_provider_order
FROM (
  SELECT public.create_professor_subscription_checkout_order(
    :'professor_one'::UUID, :'lab_one'::UUID,
    'professor_lab_standard', 'month', 'standard-month-checkout'
  ) AS payload
) AS checkout \gset

SELECT pg_temp.assert_true(
  (SELECT amount = 100 AND currency = 'TWD' AND subscription_id = :'trial_subscription_id'::UUID
   FROM public.orders WHERE id = :'standard_order_id'::UUID),
  'monthly Standard checkout must use the active DB price and existing trial subscription'
);

SELECT pg_temp.assert_true(
  (
    SELECT
      payload->>'orderId' = :'standard_order_id'
      AND payload->>'providerOrderId' = :'standard_provider_order'
      AND payload->>'productName' IS NOT NULL
      AND payload->>'planKey' = 'professor_lab_standard'
      AND payload->>'billingInterval' = 'month'
      AND (payload->>'reused')::BOOLEAN = TRUE
    FROM (
      SELECT public.create_professor_subscription_checkout_order(
        :'professor_one'::UUID, :'lab_one'::UUID,
        'professor_lab_standard', 'month', 'standard-month-checkout'
      ) AS payload
    ) AS retried_checkout
  ),
  'idempotent checkout retry must return the complete provider payload'
);

SELECT public.process_professor_subscription_event(
  'event-standard-paid', :'standard_provider_order', 'payment-standard-1',
  'paid', 100, 'TWD', '2026-07-19T01:00:00Z', '2026-08-19T01:00:00Z',
  '{"fixture_only":true}'::JSONB, NULL
);
SELECT public.process_professor_subscription_event(
  'event-standard-paid', :'standard_provider_order', 'payment-standard-1',
  'paid', 100, 'TWD', '2026-07-19T01:00:00Z', '2026-08-19T01:00:00Z',
  '{"fixture_only":true,"duplicate":true}'::JSONB, NULL
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.payments WHERE provider_payment_id = 'payment-standard-1'),
  'duplicate provider event must create one payment only'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
SELECT :'lab_one'::UUID,
  ('b1000000-0000-0000-0000-' || lpad(series::TEXT, 12, '0'))::UUID,
  'student', 'active'
FROM generate_series(1, 15) AS series;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
    VALUES (
      (SELECT id FROM public.labs
       WHERE owner_professor_id = 'a1000000-0000-0000-0000-000000000001'::UUID
         AND status = 'active'),
      'b1000000-0000-0000-0000-000000000016'::UUID,
      'student', 'active'
    );
    RAISE EXCEPTION 'Standard sixteenth seat unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%student_seat_limit_reached%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.subscriptions(
      lab_id, payer_user_id, product_id, provider, plan_key, status,
      billing_interval, current_period_start, current_period_end
    ) VALUES (
      (SELECT id FROM public.labs
       WHERE owner_professor_id = 'a1000000-0000-0000-0000-000000000001'::UUID
         AND status = 'active'),
      'a1000000-0000-0000-0000-000000000001'::UUID,
      (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
      'manual', 'professor_lab_standard', 'active', 'manual',
      timezone('utc', now()), timezone('utc', now()) + interval '1 day'
    );
    RAISE EXCEPTION 'second current subscription unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;

SELECT
  (payload->>'orderId')::UUID AS first_plus_order_id,
  payload->>'providerOrderId' AS first_plus_provider_order,
  payload->>'previousProviderSubscriptionId' AS previous_standard_provider_order,
  (payload->>'isUpgrade')::BOOLEAN AS first_plus_is_upgrade,
  (payload->>'requiresProviderCancellation')::BOOLEAN AS first_plus_requires_cancel
FROM (
  SELECT public.create_professor_subscription_checkout_order(
    :'professor_one'::UUID, :'lab_one'::UUID,
    'professor_lab_plus', 'month', 'plus-upgrade-checkout'
  ) AS payload
) AS checkout \gset

SELECT pg_temp.assert_true(
  :'first_plus_is_upgrade'::BOOLEAN
  AND :'first_plus_requires_cancel'::BOOLEAN,
  'Standard to Plus checkout must require retiring the previous provider schedule'
);

SELECT public.prepare_professor_subscription_upgrade(
  :'professor_one'::UUID,
  :'trial_subscription_id'::UUID,
  :'first_plus_order_id'::UUID,
  :'previous_standard_provider_order'
);

SELECT pg_temp.assert_true(
  (
    SELECT cancel_at_period_end = TRUE
      AND metadata->'retiredProviderSubscriptionIds' ? :'previous_standard_provider_order'
    FROM public.subscriptions
    WHERE id = :'trial_subscription_id'::UUID
  ),
  'upgrade preparation must retire the old ECPay schedule before Plus checkout'
);

SELECT pg_temp.assert_true(
  NOT (public.process_professor_subscription_event(
    'event-retired-standard-delayed', :'standard_provider_order', 'payment-retired-standard',
    'paid', 100, 'TWD', '2026-07-19T01:01:00Z', '2026-08-19T01:01:00Z',
    '{"fixture_only":true}'::JSONB, NULL
  )->>'applied')::BOOLEAN,
  'delayed events from the retired Standard schedule must not mutate the subscription'
);

SELECT public.process_professor_subscription_event(
  'event-first-plus-failed', :'first_plus_provider_order', 'payment-first-plus-failed',
  'failed', 200, 'TWD', '2026-07-19T01:01:10Z', '2026-08-19T01:01:10Z',
  '{"fixture_only":true}'::JSONB, 'failed'
);
SELECT pg_temp.assert_true(
  (
    SELECT subscription.status = 'active'
      AND subscription.plan_key = 'professor_lab_standard'
      AND payment_order.status = 'failed'
    FROM public.subscriptions AS subscription
    JOIN public.orders AS payment_order
      ON payment_order.id = :'first_plus_order_id'::UUID
    WHERE subscription.id = :'trial_subscription_id'::UUID
  ),
  'failed Plus checkout must preserve Standard access through its paid period'
);

SELECT
  (payload->>'orderId')::UUID AS plus_order_id,
  payload->>'providerOrderId' AS plus_provider_order,
  (payload->>'isUpgrade')::BOOLEAN AS retry_plus_is_upgrade,
  (payload->>'requiresProviderCancellation')::BOOLEAN AS retry_plus_requires_cancel
FROM (
  SELECT public.create_professor_subscription_checkout_order(
    :'professor_one'::UUID, :'lab_one'::UUID,
    'professor_lab_plus', 'month', 'plus-upgrade-checkout-retry'
  ) AS payload
) AS checkout \gset

SELECT pg_temp.assert_true(
  :'retry_plus_is_upgrade'::BOOLEAN
  AND NOT :'retry_plus_requires_cancel'::BOOLEAN,
  'retry after retiring Standard must not call provider cancellation twice'
);

SELECT public.process_professor_subscription_event(
  'event-plus-paid', :'plus_provider_order', 'payment-plus-1',
  'paid', 200, 'TWD', '2026-07-19T01:01:20Z', '2026-08-19T01:01:20Z',
  '{"fixture_only":true}'::JSONB, NULL
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (
  :'lab_one'::UUID,
  'b1000000-0000-0000-0000-000000000016'::UUID,
  'student', 'active'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 16 FROM public.lab_memberships
   WHERE lab_id = :'lab_one'::UUID AND role = 'student' AND status = 'active'),
  'A verified Plus upgrade must permit the sixteenth student'
);

SELECT public.process_professor_subscription_event(
  'event-plus-failed', :'plus_provider_order', 'payment-plus-failed',
  'failed', 200, 'TWD', '2026-07-19T01:02:00Z', '2026-08-19T01:02:00Z',
  '{"fixture_only":true}'::JSONB, 'failed'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'past_due' AND grace_ends_at = '2026-08-03T01:02:00Z'
   FROM public.subscriptions WHERE id = :'trial_subscription_id'::UUID),
  'failed renewal must start a 15-day grace period'
);

SELECT public.process_professor_subscription_event(
  'event-plus-same-second-active', :'plus_provider_order', 'payment-plus-same-second',
  'paid', 200, 'TWD', '2026-07-19T01:02:00Z', '2026-08-19T01:02:00Z',
  '{"fixture_only":true}'::JSONB, NULL
);
SELECT pg_temp.assert_true(
  (SELECT status = 'past_due' FROM public.subscriptions WHERE id = :'trial_subscription_id'::UUID),
  'same-second active event must not override restrictive past_due'
);

SELECT public.process_professor_subscription_event(
  'event-plus-recovered', :'plus_provider_order', 'payment-plus-recovered',
  'paid', 200, 'TWD', '2026-07-19T01:03:00Z', '2026-08-19T01:03:00Z',
  '{"fixture_only":true}'::JSONB, NULL
);
SELECT pg_temp.assert_true(
  (SELECT status = 'active' AND grace_ends_at IS NULL
   FROM public.subscriptions WHERE id = :'trial_subscription_id'::UUID),
  'newer successful renewal must recover the subscription'
);

SELECT public.mark_professor_subscription_cancel_at_period_end(
  :'professor_one'::UUID,
  :'trial_subscription_id'::UUID
);
SELECT pg_temp.assert_true(
  (SELECT cancel_at_period_end = TRUE FROM public.subscriptions
   WHERE id = :'trial_subscription_id'::UUID),
  'cancellation request must stop future renewal while retaining current period'
);

SELECT public.start_professor_subscription_trial(
  :'professor_two'::UUID, :'lab_two'::UUID,
  'professor_lab_plus', 'year'
);

SELECT (payload->>'orderId')::UUID AS yearly_order_id
FROM (
  SELECT public.create_professor_subscription_checkout_order(
    :'professor_two'::UUID, :'lab_two'::UUID,
    'professor_lab_plus', 'year', 'plus-year-checkout'
  ) AS payload
) AS yearly_checkout \gset

SELECT pg_temp.assert_true(
  (SELECT amount = 2000 FROM public.orders WHERE id = :'yearly_order_id'::UUID),
  'yearly Plus checkout must select the yearly DB price'
);

SELECT 'V2 Professor subscription integration passed.' AS result;
