\set ON_ERROR_STOP on
\set student_standard_one '11000000-0000-0000-0000-000000000001'
\set student_standard_two '11000000-0000-0000-0000-000000000002'
\set student_removed '11000000-0000-0000-0000-000000000003'
\set student_plus '11000000-0000-0000-0000-000000000004'
\set student_expired '11000000-0000-0000-0000-000000000005'
\set professor_standard '21000000-0000-0000-0000-000000000001'
\set professor_plus '21000000-0000-0000-0000-000000000002'
\set professor_expired '21000000-0000-0000-0000-000000000003'
\set assistant_standard '21000000-0000-0000-0000-000000000004'
\set document_standard_one '41000000-0000-0000-0000-000000000001'
\set document_standard_two '41000000-0000-0000-0000-000000000002'
\set document_removed '41000000-0000-0000-0000-000000000003'
\set document_plus '41000000-0000-0000-0000-000000000004'
\set document_expired '41000000-0000-0000-0000-000000000005'
\set subscription_standard '51000000-0000-0000-0000-000000000001'
\set subscription_plus '51000000-0000-0000-0000-000000000002'
\set subscription_expired '51000000-0000-0000-0000-000000000003'

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
    (:'student_standard_one'::UUID, 'pool-standard-one@local.test', 'Pool Standard One'),
    (:'student_standard_two'::UUID, 'pool-standard-two@local.test', 'Pool Standard Two'),
    (:'student_removed'::UUID, 'pool-removed@local.test', 'Pool Removed'),
    (:'student_plus'::UUID, 'pool-plus@local.test', 'Pool Plus'),
    (:'student_expired'::UUID, 'pool-expired@local.test', 'Pool Expired'),
    (:'professor_standard'::UUID, 'pool-professor-standard@local.test', 'Pool Professor Standard'),
    (:'professor_plus'::UUID, 'pool-professor-plus@local.test', 'Pool Professor Plus'),
    (:'professor_expired'::UUID, 'pool-professor-expired@local.test', 'Pool Professor Expired'),
    (:'assistant_standard'::UUID, 'pool-assistant@local.test', 'Pool Assistant')
) AS fixture(id, email, name);

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (
  :'professor_standard'::UUID,
  :'professor_plus'::UUID,
  :'professor_expired'::UUID,
  :'assistant_standard'::UUID
);

SELECT public.create_professor_lab(
  :'professor_standard'::UUID,
  'PDF Standard Lab',
  'Local University'
) AS standard_lab \gset

SELECT public.create_professor_lab(
  :'professor_plus'::UUID,
  'PDF Plus Lab',
  'Local University'
) AS plus_lab \gset

SELECT public.create_professor_lab(
  :'professor_expired'::UUID,
  'PDF Expired Lab',
  'Local University'
) AS expired_lab \gset

INSERT INTO public.subscriptions(
  id, lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES
  (
    :'subscription_standard'::UUID,
    :'standard_lab'::UUID,
    :'professor_standard'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
    'manual'::public.payment_provider,
    'professor_lab_standard'::public.professor_plan_key,
    'active'::public.subscription_status,
    'manual'::public.subscription_interval,
    timezone('utc', now()) - interval '40 days',
    timezone('utc', now()) + interval '20 days'
  ),
  (
    :'subscription_plus'::UUID,
    :'plus_lab'::UUID,
    :'professor_plus'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-plus'),
    'manual'::public.payment_provider,
    'professor_lab_plus'::public.professor_plan_key,
    'active'::public.subscription_status,
    'manual'::public.subscription_interval,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '29 days'
  ),
  (
    :'subscription_expired'::UUID,
    :'expired_lab'::UUID,
    :'professor_expired'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
    'manual'::public.payment_provider,
    'professor_lab_standard'::public.professor_plan_key,
    'active'::public.subscription_status,
    'manual'::public.subscription_interval,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '29 days'
  );

INSERT INTO public.lab_memberships(
  lab_id, user_id, role, status, removed_at, removal_reason
)
VALUES
  (:'standard_lab'::UUID, :'student_standard_one'::UUID, 'student', 'active', NULL, NULL),
  (:'standard_lab'::UUID, :'student_standard_two'::UUID, 'student', 'active', NULL, NULL),
  (:'standard_lab'::UUID, :'student_removed'::UUID, 'student', 'removed', timezone('utc', now()), 'Local fixture'),
  (:'standard_lab'::UUID, :'assistant_standard'::UUID, 'assistant', 'active', NULL, NULL),
  (:'plus_lab'::UUID, :'student_plus'::UUID, 'student', 'active', NULL, NULL),
  (:'expired_lab'::UUID, :'student_expired'::UUID, 'student', 'active', NULL, NULL);

UPDATE public.subscriptions
SET
  status = 'expired'::public.subscription_status,
  current_period_start = timezone('utc', now()) - interval '60 days',
  current_period_end = timezone('utc', now()) - interval '30 days'
WHERE id = :'subscription_expired'::UUID;

INSERT INTO public.student_documents(
  id, user_id, storage_bucket, storage_path, original_filename,
  mime_type, file_size_bytes, document_type, upload_status, sha256_hex
)
VALUES
  (:'document_standard_one'::UUID, :'student_standard_one'::UUID, 'student-documents', :'student_standard_one' || '/' || :'document_standard_one' || '/one.pdf', 'one.pdf', 'application/pdf', 1024, 'thesis', 'ready', repeat('1', 64)),
  (:'document_standard_two'::UUID, :'student_standard_two'::UUID, 'student-documents', :'student_standard_two' || '/' || :'document_standard_two' || '/two.pdf', 'two.pdf', 'application/pdf', 1024, 'thesis', 'ready', repeat('2', 64)),
  (:'document_removed'::UUID, :'student_removed'::UUID, 'student-documents', :'student_removed' || '/' || :'document_removed' || '/removed.pdf', 'removed.pdf', 'application/pdf', 1024, 'thesis', 'ready', repeat('3', 64)),
  (:'document_plus'::UUID, :'student_plus'::UUID, 'student-documents', :'student_plus' || '/' || :'document_plus' || '/plus.pdf', 'plus.pdf', 'application/pdf', 1024, 'thesis', 'ready', repeat('4', 64)),
  (:'document_expired'::UUID, :'student_expired'::UUID, 'student-documents', :'student_expired' || '/' || :'document_expired' || '/expired.pdf', 'expired.pdf', 'application/pdf', 1024, 'thesis', 'ready', repeat('5', 64));

-- A fully used historical period must not reduce the new period.
INSERT INTO public.lab_usage_credits(
  lab_id, subscription_id, period_start, period_end,
  pdf_audit_limit, pdf_audit_reserved, pdf_audit_used
)
VALUES (
  :'standard_lab'::UUID,
  :'subscription_standard'::UUID,
  (SELECT current_period_start FROM public.subscriptions WHERE id = :'subscription_standard'::UUID),
  (SELECT current_period_start + interval '1 month' FROM public.subscriptions WHERE id = :'subscription_standard'::UUID),
  30,
  0,
  30
);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_standard_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT * FROM public.get_my_lab_pdf_credit_balance() \gset standard_
SELECT pg_temp.assert_true(
  :'standard_pdf_audit_limit'::INTEGER = 30
    AND :'standard_pdf_audit_used'::INTEGER = 0
    AND :'standard_pdf_audit_remaining'::INTEGER = 30,
  'Standard must receive a fresh non-rollover pool of 30 audits'
);
COMMIT;

SELECT id AS standard_credit_id
FROM public.lab_usage_credits
WHERE lab_id = :'standard_lab'::UUID
  AND period_start <= timezone('utc', now())
  AND period_end > timezone('utc', now())
\gset

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_plus', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT * FROM public.get_my_lab_pdf_credit_balance() \gset plus_
SELECT pg_temp.assert_true(
  :'plus_pdf_audit_limit'::INTEGER = 100
    AND :'plus_pdf_audit_used'::INTEGER = 0
    AND :'plus_pdf_audit_remaining'::INTEGER = 100,
  'Plus must receive a monthly pool of 100 audits'
);
COMMIT;

DO $$
BEGIN
  BEGIN
    PERFORM public.reserve_lab_pdf_audit_job(
      '11000000-0000-0000-0000-000000000003'::UUID,
      '41000000-0000-0000-0000-000000000003'::UUID,
      'logic_check', 'openai', 'local-model', 'local prompt',
      '82000000-0000-4000-8000-000000000003'::UUID
    );
    RAISE EXCEPTION 'removed student unexpectedly reserved a credit';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%active_student_lab_membership_required%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.reserve_lab_pdf_audit_job(
      '11000000-0000-0000-0000-000000000005'::UUID,
      '41000000-0000-0000-0000-000000000005'::UUID,
      'logic_check', 'openai', 'local-model', 'local prompt',
      '82000000-0000-4000-8000-000000000005'::UUID
    );
    RAISE EXCEPTION 'expired Lab subscription unexpectedly reserved a credit';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%functional_lab_subscription_required%' THEN RAISE; END IF;
  END;
END;
$$;

-- Non-students can execute neither the user balance behavior nor a reservation.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_standard', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    PERFORM public.get_my_lab_pdf_credit_balance();
    RAISE EXCEPTION 'professor unexpectedly received a student pool';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%active_student_profile_required%' THEN RAISE; END IF;
  END;
END;
$$;
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_standard', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    PERFORM public.get_my_lab_pdf_credit_balance();
    RAISE EXCEPTION 'assistant unexpectedly received a student pool';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%active_student_profile_required%' THEN RAISE; END IF;
  END;
END;
$$;
COMMIT;

-- Same idempotency key must not reserve twice; failure refunds once.
SELECT job_id AS replay_job, created AS replay_created
FROM public.reserve_lab_pdf_audit_job(
  :'student_plus'::UUID,
  :'document_plus'::UUID,
  'logic_check', 'anthropic', 'local-model', 'local prompt',
  '82000000-0000-4000-8000-000000000004'::UUID
) \gset

SELECT job_id AS replay_job_again, created AS replay_created_again
FROM public.reserve_lab_pdf_audit_job(
  :'student_plus'::UUID,
  :'document_plus'::UUID,
  'logic_check', 'anthropic', 'local-model', 'local prompt',
  '82000000-0000-4000-8000-000000000004'::UUID
) \gset

SELECT pg_temp.assert_true(
  :'replay_job'::UUID = :'replay_job_again'::UUID
    AND :'replay_created'::BOOLEAN
    AND NOT :'replay_created_again'::BOOLEAN
    AND (
      SELECT pdf_audit_reserved = 1 AND pdf_audit_used = 0
      FROM public.lab_usage_credits
      WHERE id = (SELECT credit_id FROM public.ai_audit_jobs WHERE id = :'replay_job'::UUID)
    ),
  'idempotent replay must return one job and reserve one shared credit'
);

SELECT public.fail_lab_pdf_audit_job(:'replay_job'::UUID, 'provider_failure', 'Local provider failure');
SELECT public.fail_lab_pdf_audit_job(:'replay_job'::UUID, 'provider_failure', 'Local provider failure');

SELECT pg_temp.assert_true(
  (
    SELECT pdf_audit_reserved = 0 AND pdf_audit_used = 0
    FROM public.lab_usage_credits
    WHERE id = (SELECT credit_id FROM public.ai_audit_jobs WHERE id = :'replay_job'::UUID)
  )
  AND (
    SELECT status = 'failed'::public.ai_audit_job_status
      AND credit_state = 'refunded'::public.audit_credit_state
    FROM public.ai_audit_jobs
    WHERE id = :'replay_job'::UUID
  ),
  'failed replay must refund exactly once'
);

-- Prepare a single remaining Standard credit for the shell concurrency test.
UPDATE public.lab_usage_credits
SET pdf_audit_limit = 1, pdf_audit_reserved = 0, pdf_audit_used = 0
WHERE id = :'standard_credit_id'::UUID;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.lab_usage_credits WHERE id = :'standard_credit_id'::UUID AND pdf_audit_limit = 1),
  'concurrency fixture must expose exactly one remaining shared credit'
);

SELECT :'standard_credit_id'::UUID AS standard_credit_id;
