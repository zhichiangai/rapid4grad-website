\set ON_ERROR_STOP on
\set standard_buyer '91000000-0000-0000-0000-000000000001'
\set lab_buyer '91000000-0000-0000-0000-000000000002'
\set failed_buyer '91000000-0000-0000-0000-000000000003'
\set cancelled_buyer '91000000-0000-0000-0000-000000000004'
\set concurrent_buyer '91000000-0000-0000-0000-000000000005'

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
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
SELECT
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  'local-test-only',
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', fixture.name),
  timezone('utc', now()),
  timezone('utc', now())
FROM (
  VALUES
    (:'standard_buyer'::UUID, 'course-standard@local.test', 'Course Standard'),
    (:'lab_buyer'::UUID, 'course-lab@local.test', 'Course Lab'),
    (:'failed_buyer'::UUID, 'course-failed@local.test', 'Course Failed'),
    (:'cancelled_buyer'::UUID, 'course-cancelled@local.test', 'Course Cancelled'),
    (:'concurrent_buyer'::UUID, 'course-concurrent@local.test', 'Course Concurrent')
) AS fixture(id, email, name);

UPDATE public.products
SET is_active = TRUE
WHERE slug IN ('student-course-full', 'student-lab-course-upgrade');

-- These amounts are isolated test fixtures, not product pricing decisions.
INSERT INTO public.product_prices(
  product_id, provider, currency, amount, interval, is_active, metadata
)
VALUES
  (
    (SELECT id FROM public.products WHERE slug = 'student-lab-course-upgrade'),
    'manual', 'TWD', 1800, 'one_time', TRUE,
    '{"fixture_only":true}'::JSONB
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (
  (SELECT id FROM public.labs WHERE owner_professor_id = '20000000-0000-0000-0000-000000000002'::UUID),
  :'lab_buyer'::UUID,
  'student',
  'active'
);

CREATE TEMP TABLE standard_checkout AS
SELECT * FROM public.create_student_course_checkout_order(
  :'standard_buyer'::UUID,
  'manual',
  'standard-checkout-idempotency'
);
SELECT order_id AS standard_order_id FROM standard_checkout \gset

SELECT pg_temp.assert_true(
  (SELECT product_slug = 'student-course-full' AND amount = 2400 AND NOT is_lab_discount FROM standard_checkout),
  'non-Lab buyer must receive the active standard price'
);

UPDATE public.orders
SET
  provider_order_id = 'manual_' || id::TEXT,
  status = 'processing'
WHERE id = (SELECT order_id FROM standard_checkout);

SELECT public.process_one_time_payment_event(
  'manual',
  'standard-event-completed',
  'test.checkout.completed',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM standard_checkout)),
  'standard-payment-completed',
  'completed',
  2400,
  'TWD',
  timezone('utc', now()),
  '{"fixture_only":true}'::JSONB
);

SELECT public.process_one_time_payment_event(
  'manual',
  'standard-event-completed',
  'test.checkout.completed',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM standard_checkout)),
  'standard-payment-completed',
  'completed',
  2400,
  'TWD',
  timezone('utc', now()),
  '{"fixture_only":true,"duplicate":true}'::JSONB
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.payments WHERE provider_payment_id = 'standard-payment-completed'),
  'duplicate webhook must not create a second payment'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND bool_and(ends_at IS NULL)
   FROM public.entitlements
   WHERE user_id = :'standard_buyer'::UUID
     AND entitlement_type = 'course_full'
     AND status = 'active'),
  'completed checkout must grant one permanent course_full entitlement'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.create_student_course_checkout_order(
      '91000000-0000-0000-0000-000000000001'::UUID,
      'manual',
      'already-owned-new-checkout'
    );
    RAISE EXCEPTION 'already-owned checkout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%course_already_owned%' THEN RAISE; END IF;
  END;
END;
$$;

CREATE TEMP TABLE lab_checkout AS
SELECT * FROM public.create_student_course_checkout_order(
  :'lab_buyer'::UUID,
  'manual',
  'lab-checkout-idempotency'
);

SELECT pg_temp.assert_true(
  (SELECT product_slug = 'student-lab-course-upgrade' AND amount = 1800 AND is_lab_discount FROM lab_checkout),
  'active subscribed Lab student must receive the active Lab price'
);

UPDATE public.orders
SET provider_order_id = 'manual_' || id::TEXT, status = 'processing'
WHERE id = (SELECT order_id FROM lab_checkout);

SELECT public.process_one_time_payment_event(
  'manual', 'lab-event-completed', 'test.checkout.completed',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM lab_checkout)),
  'lab-payment-completed', 'completed', 1800, 'TWD', timezone('utc', now()),
  '{"fixture_only":true}'::JSONB
);

SELECT public.remove_lab_member(
  '20000000-0000-0000-0000-000000000002'::UUID,
  (SELECT id FROM public.labs WHERE owner_professor_id = '20000000-0000-0000-0000-000000000002'::UUID),
  :'lab_buyer'::UUID,
  'Course entitlement persistence test'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.entitlements
   WHERE user_id = :'lab_buyer'::UUID
     AND entitlement_type = 'course_full'
     AND status = 'active'
     AND ends_at IS NULL),
  'leaving a Lab must not revoke a purchased permanent entitlement'
);

CREATE TEMP TABLE failed_checkout AS
SELECT * FROM public.create_student_course_checkout_order(
  :'failed_buyer'::UUID, 'manual', 'failed-checkout-idempotency'
);
UPDATE public.orders SET provider_order_id = 'manual_' || id::TEXT, status = 'processing'
WHERE id = (SELECT order_id FROM failed_checkout);
SELECT public.process_one_time_payment_event(
  'manual', 'failed-event', 'test.checkout.failed',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM failed_checkout)),
  'failed-payment', 'failed', 2400, 'TWD', timezone('utc', now()),
  '{"fixture_only":true}'::JSONB
);
SELECT pg_temp.assert_true(
  (SELECT status = 'failed' FROM public.orders WHERE id = (SELECT order_id FROM failed_checkout)),
  'failed payment must mark the order failed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.entitlements WHERE user_id = :'failed_buyer'::UUID),
  'failed payment must not grant course entitlement'
);

CREATE TEMP TABLE cancelled_checkout AS
SELECT * FROM public.create_student_course_checkout_order(
  :'cancelled_buyer'::UUID, 'manual', 'cancelled-checkout-idempotency'
);
UPDATE public.orders SET provider_order_id = 'manual_' || id::TEXT, status = 'processing'
WHERE id = (SELECT order_id FROM cancelled_checkout);
SELECT public.process_one_time_payment_event(
  'manual', 'cancelled-event', 'test.checkout.cancelled',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM cancelled_checkout)),
  'cancelled-payment', 'cancelled', 2400, 'TWD', timezone('utc', now()),
  '{"fixture_only":true}'::JSONB
);
SELECT pg_temp.assert_true(
  (SELECT status = 'cancelled' FROM public.orders WHERE id = (SELECT order_id FROM cancelled_checkout)),
  'cancelled payment must mark the order cancelled'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.entitlements WHERE user_id = :'cancelled_buyer'::UUID),
  'cancelled payment must not grant course entitlement'
);

-- Refund events are recorded, but entitlement revocation is an explicit Admin action.
SELECT public.process_one_time_payment_event(
  'manual', 'standard-event-refunded', 'test.checkout.refunded',
  (SELECT provider_order_id FROM public.orders WHERE id = (SELECT order_id FROM standard_checkout)),
  'standard-payment-completed', 'refunded', 2400, 'TWD', timezone('utc', now()),
  '{"fixture_only":true,"manual_review":true}'::JSONB
);
SELECT pg_temp.assert_true(
  (SELECT status = 'refunded' FROM public.orders WHERE id = (SELECT order_id FROM standard_checkout)),
  'refund event must mark the order for refunded-state review'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.entitlements
   WHERE user_id = :'standard_buyer'::UUID
     AND entitlement_type = 'course_full'
     AND status = 'active'),
  'refund event must not automatically revoke entitlement'
);

-- RLS isolates order status from another authenticated user.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'failed_buyer', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.orders WHERE id = :'standard_order_id'::UUID),
  'a different user must not read another user order'
);
COMMIT;

-- Prepare an unpaid order for the shell-level concurrent webhook test.
CREATE TEMP TABLE concurrent_checkout AS
SELECT * FROM public.create_student_course_checkout_order(
  :'concurrent_buyer'::UUID, 'manual', 'concurrent-checkout-idempotency'
);
UPDATE public.orders SET provider_order_id = 'manual_concurrent_order', status = 'processing'
WHERE id = (SELECT order_id FROM concurrent_checkout);

SELECT 'V2 student course purchase integration fixtures passed.' AS result;
